import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import * as properties from 'properties';
import * as semver from 'semver';
import { simpleGit } from 'simple-git';
import { formatVersion, parseSemver, ZERO_SEMVER } from './versions';

async function git_add(file: string): Promise<void> {
  await simpleGit()
    .exec(() => core.debug(`Starting 'git add ${file}'...`))
    .add(file)
    .exec(() => core.debug(`Finished 'git add ${file}'...`));
}

function _inc_version(version: semver.SemVer, release: semver.ReleaseType): semver.SemVer {
  const incrementedVersion: string | null = semver.inc(version, release);
  if (version === null || incrementedVersion === null) {
    core.setFailed(`Failed to increment ${release} version of ${version}`);
    return ZERO_SEMVER;
  }
  return new semver.SemVer(incrementedVersion);
}

function _next_plugin_version(
  plugin_version: semver.SemVer,
  current_platform_version: semver.SemVer,
  new_platform_version: semver.SemVer,
): semver.SemVer {
  // # Platform: 2022.3.2 -> 2023.1.0
  // # Plugin  :    0.2.6 ->    1.0.0
  if (new_platform_version.major > current_platform_version.major) {
    return _inc_version(plugin_version, 'major');
  }

  // # Platform: 2022.1.1 -> 2023.2.0
  // # Plugin  :    0.2.6 ->    0.3.0
  if (new_platform_version.minor > current_platform_version.minor) {
    return _inc_version(plugin_version, 'minor');
  }

  // # Platform: 2022.3.2 -> 2023.3.3
  // # Plugin  :    0.2.6 ->    0.2.7
  if (new_platform_version.patch > current_platform_version.patch) {
    return _inc_version(plugin_version, 'patch');
  }

  return plugin_version;
}

export async function updateGradleProperties(latestIdeVersion: semver.SemVer): Promise<semver.SemVer> {
  try {
    core.debug('Updating  [gradle.properties] file...');
    core.debug(latestIdeVersion.version);

    const globber = await glob.create('./gradle.properties');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files`);
    if (files.length !== 1) {
      core.setFailed('Too many .properties files found. Exiting.');
    }
    const gradle_file = files[0];

    interface JBGradlePropertiesFile {
      pluginVersion?: string | number;
      pluginVerifierIdeVersions?: string | number;
      platformVersion?: string | number;
    }

    const gradleProperties: JBGradlePropertiesFile = properties.parse(readFileSync(gradle_file, 'utf-8'), {
      namespaces: true,
      sections: true,
      variables: true,
    });
    core.debug(`properties:`);
    core.debug(JSON.stringify(gradleProperties));
    const currentPluginVersion = parseSemver(gradleProperties?.pluginVersion?.toString());

    // const currentPluginVerifierIdeVersions = parseSemver(gradleProperties?.pluginVerifierIdeVersions?.toString());
    const currentPluginVerifierIdeVersions = gradleProperties?.pluginVerifierIdeVersions?.toString().split(',')
      .map((v) => {
        const semVer = parseSemver(v);
        core.info(`${v} -> ${semVer}`);
        return semVer;
      })
      .filter((v) => {
        if (v.compare(ZERO_SEMVER)) {
          return true;
        }
        return false;
      });


    const currentPlatformVersion = parseSemver(gradleProperties?.platformVersion?.toString());
    core.debug(`currentPluginVersion:             ${currentPluginVersion}`);
    core.debug(`currentPluginVerifierIdeVersions: ${currentPluginVerifierIdeVersions}`);
    core.debug(`currentPlatformVersion:           ${currentPlatformVersion}`);

    if (semver.eq(currentPlatformVersion, latestIdeVersion)) {
      // Skip further execution, as the platform version is already the same, and we will end the action
      return currentPlatformVersion;
    }

    const next_plugin_version: semver.SemVer = _next_plugin_version(
      currentPluginVersion,
      currentPlatformVersion,
      latestIdeVersion,
    );
    core.debug('');
    core.debug(`next_plugin_version:                  ${next_plugin_version}`);

    const data = fs.readFileSync(gradle_file, 'utf8');

    core.debug('File contents:');
    core.debug(data);

    const nextPlatformVersion = formatVersion(latestIdeVersion);
    // Note: We intentionally use the non-semver object variables for the `new RegExp()` since the semver objects may
    // include an extra `.0` for the 'patch' version that would not be found in the `gradle.properties` file.
    // (e.g., the string/number `2022.2` would be in the `gradle.properties` file,
    // but the semver object would be `2022.2.0`, and thus we would not find this
    // in the `gradle.properties` file.
    const result = data
      .replace(
        new RegExp(`^pluginVersion = ${gradleProperties?.pluginVersion?.toString()}$`, 'gm'),
        `pluginVersion = ${next_plugin_version}`,
      )
      .replace(
        // Just grab and replace only the first version (up to the first comma)
        new RegExp(`^pluginVerifierIdeVersions = ${formatVersion(currentPlatformVersion)}`, 'gm'),
        `pluginVerifierIdeVersions = ${nextPlatformVersion}`,
      )
      .replace(
        new RegExp(`^platformVersion = ${gradleProperties?.platformVersion?.toString()}$`, 'gm'),
        `platformVersion = ${nextPlatformVersion}`,
      );

    core.debug('Updated file contents:');
    core.debug(result);

    await fs.promises.writeFile(gradle_file, result, 'utf8');

    core.debug(`${gradle_file} file written; about to git add...`);

    // `git add gradle.properties`
    await git_add(gradle_file);

    core.debug('Completed [gradle.properties] file.');

    return currentPlatformVersion ? currentPlatformVersion : new semver.SemVer('0.0.0');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
    return new semver.SemVer('0.0.0');
  }
}

export async function updateChangelog(
  currentPlatformVersion: semver.SemVer,
  latestIdeVersion: semver.SemVer,
): Promise<void> {
  try {
    core.debug('Updating  [CHANGELOG.md] file...');
    core.debug(latestIdeVersion.version);

    const upgradeLine = `- Upgrading IntelliJ from ${formatVersion(currentPlatformVersion)} to ${latestIdeVersion}`;

    const globber = await glob.create('./CHANGELOG.md');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files`);
    if (files.length !== 1) {
      core.setFailed('Too many .properties files found. Exiting.');
    }
    const changelogFile = files[0];

    const data = fs.readFileSync(changelogFile, 'utf8');

    if (new RegExp(`^${upgradeLine}$`, 'gm').test(data)) {
      core.info(`Skipping  [CHANGELOG.md] file, already found "${upgradeLine}" in file.`);
      return;
    }

    const result = data.replace(
      // We do *NOT* want the `g` flag, as we only want to replace the first instance
      // (which should be in the `Unreleased` section) of this section.
      new RegExp(`^### Changed$`, 'm'),
      `### Changed\n${upgradeLine}`,
    );

    core.debug('Updated file contents:');
    core.debug(result);

    await fs.promises.writeFile(changelogFile, result, 'utf8');

    core.debug(`${changelogFile} file written; about to git add...`);

    // `git add CHANGELOG.md`
    await git_add(changelogFile);

    core.debug('Completed [CHANGELOG.md] file.');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

function _fileContains(file: string, search: string): boolean {
  const fileData = fs.readFileSync(file, 'utf8');

  // core.debug(`[${file}] File contents:`)
  // core.debug(fileData)

  return new RegExp(`${search}`, 'gm').test(fileData);
}

export async function updateGithubWorkflow(
  currentPlatformVersion: semver.SemVer,
  latestIdeVersion: semver.SemVer,
): Promise<void> {
  try {
    core.debug('Updating GitHub workflow files...');
    core.debug(`currentPlatformVersion: ${currentPlatformVersion.version}`);
    core.debug(`latestIdeVersion:       ${latestIdeVersion.version}`);

    const globber = await glob.create('./.github/workflows/*');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files...`);

    const filesToUpdate = files.filter((file) => {
      return _fileContains(file, 'uses: ChrisCarini/intellij-platform-plugin-verifier-action');
    });

    core.debug(
      `Found ${filesToUpdate.length} files containing [ChrisCarini/intellij-platform-plugin-verifier-action]...`,
    );

    for (const file of filesToUpdate) {
      const data = fs.readFileSync(file, 'utf8');
      const result = data
        .replace(new RegExp(`ideaIC:${formatVersion(currentPlatformVersion)}`, 'gm'), `ideaIC:${latestIdeVersion}`)
        .replace(new RegExp(`ideaIU:${formatVersion(currentPlatformVersion)}`, 'gm'), `ideaIU:${latestIdeVersion}`);

      core.debug('Updated file contents:');
      core.debug(result);

      await fs.promises.writeFile(file, result, 'utf8');

      core.debug(`${file} file written; about to git add...`);

      // `git add <current_workflow_file>`
      await git_add(file);

      core.debug(`Completed [${file}] file.`);
    }

    core.debug(`Completed updating ${filesToUpdate.length} GitHub workflow files.`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}
