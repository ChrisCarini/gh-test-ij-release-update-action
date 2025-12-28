import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import * as properties from 'properties';
import * as semver from 'semver';
import { simpleGit } from 'simple-git';
import { formatVersion, parseSemver, ZERO_SEMVER } from './versions.ts';
async function git_add(file) {
    await simpleGit()
        .exec(() => core.debug(`Starting 'git add ${file}'...`))
        .add(file)
        .exec(() => core.debug(`Finished 'git add ${file}'...`));
}
export const _inc_version = (version, release) => {
    const incrementedVersion = semver.inc(version, release);
    if (version === null || incrementedVersion === null) {
        throw new Error(`Failed to increment ${release} version of ${version}`);
    }
    return new semver.SemVer(incrementedVersion);
};
export function _next_plugin_version(plugin_version, current_platform_version, new_platform_version) {
    // const [current_major, current_minor, current_patch, current_build = 0] = current_platform_version
    //   .split('.')
    //   .map(Number);
    // const [new_major, new_minor, new_patch, new_build = 0] = new_platform_version.split('.').map(Number);
    //
    // // # Platform: 2022.3.2 -> 2023.1.0
    // // # Plugin  :    0.2.6 ->    1.0.0
    // if (new_major > current_major) {
    //   return _inc_version(plugin_version, 'major');
    // }
    //
    // // # Platform: 2022.1.1 -> 2022.2.0
    // // # Plugin  :    0.2.6 ->    0.3.0
    // if (new_minor > current_minor) {
    //   return _inc_version(plugin_version, 'minor');
    // }
    //
    // // # Platform: 2022.3.2 -> 2022.3.3
    // // # Plugin  :    0.2.6 ->    0.2.7
    // if (new_patch > current_patch) {
    //   return _inc_version(plugin_version, 'patch');
    // }
    //
    // // # Platform: 2024.3.1 -> 2024.3.1.1
    // // # Plugin  :    0.2.6 ->    0.2.7
    // if (new_build > current_build) {
    //   return _inc_version(plugin_version, 'patch');
    // }
    //
    // return plugin_version;
    // # Platform: 2022.3.2 -> 2023.1.0
    // # Plugin  :    0.2.6 ->    1.0.0
    if (new_platform_version.major > current_platform_version.major) {
        return _inc_version(plugin_version, 'major');
    }
    // # Platform: 2022.1.1 -> 2022.2.0
    // # Plugin  :    0.2.6 ->    0.3.0
    if (new_platform_version.minor > current_platform_version.minor) {
        return _inc_version(plugin_version, 'minor');
    }
    // # Platform: 2022.3.2 -> 2022.3.3
    // # Plugin  :    0.2.6 ->    0.2.7
    if (new_platform_version.patch > current_platform_version.patch) {
        return _inc_version(plugin_version, 'patch');
    }
    return plugin_version;
}
export async function updateGradleProperties(releaseInfo, latestIdeVersion, gradlePropertyVersionName) {
    core.debug('Updating [gradle.properties] file...');
    core.debug(latestIdeVersion.version);
    const globber = await glob.create('./gradle.properties');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files`);
    if (files.length !== 1) {
        core.setFailed('Too many .properties files found. Exiting.');
    }
    const gradle_file = files[0];
    const gradleProperties = properties.parse(readFileSync(gradle_file, 'utf-8'), {
        namespaces: true,
        sections: true,
        variables: true,
    });
    core.debug(`properties:`);
    core.debug(JSON.stringify(gradleProperties));
    const version = gradleProperties?.[gradlePropertyVersionName]?.toString();
    const currentVersion = parseSemver(version);
    const currentPluginVerifierIdeVersions = gradleProperties?.pluginVerifierIdeVersions
        ?.toString()
        .split(',')
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
    core.debug(`currentVersion:                   ${currentVersion} ( (${gradlePropertyVersionName}) )`);
    core.debug(`currentPluginVerifierIdeVersions: ${currentPluginVerifierIdeVersions}`);
    core.debug(`currentPlatformVersion:           ${currentPlatformVersion}`);
    core.debug(`currentPluginSinceBuild:          ${gradleProperties?.pluginSinceBuild}`);
    core.debug(`currentPluginUntilBuild:          ${gradleProperties?.pluginUntilBuild}`);
    if (semver.eq(currentPlatformVersion, latestIdeVersion)) {
        // Skip further execution, as the platform version is already the same, and we will end the action
        return currentPlatformVersion;
    }
    if (currentPlatformVersion === undefined) {
        throw new Error('No platformVersion found in the gradle.properties file. Exiting.');
    }
    const next_plugin_version = _next_plugin_version(currentVersion, currentPlatformVersion, latestIdeVersion);
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
        .replace(new RegExp(`^${gradlePropertyVersionName} = ${version}$`, 'gm'), `${gradlePropertyVersionName} = ${next_plugin_version}`)
        .replace(
    // Just grab and replace only the first version (up to the first comma)
    new RegExp(`^pluginVerifierIdeVersions = ${formatVersion(currentPlatformVersion)}`, 'gm'), `pluginVerifierIdeVersions = ${nextPlatformVersion}`)
        .replace(new RegExp(`^platformVersion = ${gradleProperties?.platformVersion?.toString()}$`, 'gm'), `platformVersion = ${nextPlatformVersion}`)
        .replace(new RegExp(`^pluginSinceBuild = ${gradleProperties?.pluginSinceBuild?.toString()}$`, 'gm'), `pluginSinceBuild = ${releaseInfo.build.split('.')[0].toString()}`)
        .replace(new RegExp(`^pluginUntilBuild = ${gradleProperties?.pluginUntilBuild?.toString()}$`, 'gm'), `pluginUntilBuild = ${releaseInfo.build.split('.')[0].toString()}.*`);
    core.debug('Updated file contents:');
    core.debug(result);
    await fs.promises.writeFile(gradle_file, result, 'utf8');
    core.debug(`${gradle_file} file written; about to git add...`);
    // `git add gradle.properties`
    await git_add(gradle_file);
    core.debug('Completed [gradle.properties] file.');
    return currentPlatformVersion ? currentPlatformVersion : ZERO_SEMVER;
}
export async function updateChangelog(currentPlatformVersion, latestIdeVersion) {
    core.debug('Updating [CHANGELOG.md] file...');
    core.debug(latestIdeVersion.version);
    const upgradeLine = `- Upgrading IntelliJ from ${formatVersion(currentPlatformVersion)} to ${latestIdeVersion}`;
    const globber = await glob.create('./CHANGELOG.md');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files`);
    if (files.length !== 1) {
        throw new Error('Too many ./CHANGELOG.md files found. Exiting.');
    }
    const changelogFile = files[0];
    const data = fs.readFileSync(changelogFile, 'utf8');
    if (new RegExp(`^${upgradeLine}$`, 'gm').test(data)) {
        core.info(`Skipping [CHANGELOG.md] file, already found "${upgradeLine}" in file.`);
        return;
    }
    const result = data.replace(
    // We do *NOT* want the `g` flag, as we only want to replace the first instance
    // (which should be in the `Unreleased` section) of this section.
    new RegExp(`^### Changed$`, 'm'), `### Changed\n${upgradeLine}`);
    core.debug('Updated file contents:');
    core.debug(result);
    await fs.promises.writeFile(changelogFile, result, 'utf8');
    core.debug(`${changelogFile} file written; about to git add...`);
    // `git add CHANGELOG.md`
    await git_add(changelogFile);
    core.debug('Completed [CHANGELOG.md] file.');
}
function _fileContains(file, search) {
    const fileData = fs.readFileSync(file, 'utf8');
    // core.debug(`[${file}] File contents:`)
    // core.debug(fileData)
    return new RegExp(`${search}`, 'gm').test(fileData);
}
export async function updateGithubWorkflow(currentPlatformVersion, latestIdeVersion) {
    core.debug('Updating GitHub workflow files...');
    core.debug(`currentPlatformVersion: ${currentPlatformVersion.version}`);
    core.debug(`latestIdeVersion:       ${latestIdeVersion.version}`);
    const globber = await glob.create('./.github/workflows/*');
    const files = await globber.glob();
    core.debug(`Found ${files.length} files...`);
    const filesToUpdate = files.filter((file) => {
        return _fileContains(file, 'uses: ChrisCarini/intellij-platform-plugin-verifier-action');
    });
    core.debug(`Found ${filesToUpdate.length} files containing [ChrisCarini/intellij-platform-plugin-verifier-action]...`);
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
}
