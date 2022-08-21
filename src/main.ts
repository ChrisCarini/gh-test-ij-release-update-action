import * as core from '@actions/core';
import * as github from '@actions/github';
import { WorkflowDispatchEvent } from '@octokit/webhooks-definitions/schema';
import * as semver from 'semver';
import simpleGit, { StatusResult } from 'simple-git';
import { updateChangelog, updateGithubWorkflow, updateGradleProperties } from './jetbrains/files';
import { getLatestIntellijReleaseInfo, parseSemver } from './jetbrains/versions';
import { JetBrainsProductReleaseInfo } from './testtttt';

async function checkFileChangeCount(): Promise<number> {
  core.debug('BEFORE: simpleGit().status()');
  const statusResult: StatusResult = await simpleGit().status();
  core.debug('AFTER: simpleGit().status()');

  core.debug(`Files created:  ${statusResult.created.length}`);
  core.debug(`Files modified: ${statusResult.modified.length}`);
  core.debug(`Files deleted:  ${statusResult.deleted.length}`);

  statusResult.created.forEach((value) => {
    core.debug(`C --> ${value}`);
  });
  statusResult.modified.forEach((value) => {
    core.debug(`M --> ${value}`);
  });
  statusResult.deleted.forEach((value) => {
    core.debug(`D --> ${value}`);
  });
  return statusResult.modified.length;
}

async function run(): Promise<void> {
  try {
    // get the latest intellij release
    const releaseInfo: JetBrainsProductReleaseInfo = await getLatestIntellijReleaseInfo();
    core.debug(`Latest IntelliJ Release Info:`);
    core.debug(JSON.stringify(releaseInfo));
    const latestVersion: semver.SemVer = parseSemver(releaseInfo.version);
    core.debug(`Latest IntelliJ Version: ${latestVersion}`);

    // update gradle.properties file
    const currentPlatformVersion = await updateGradleProperties(latestVersion);
    core.debug(`Current Platform Version: ${currentPlatformVersion}`);

    // update CHANGELOG.md
    await updateChangelog(latestVersion);

    // update github workflows
    await updateGithubWorkflow(currentPlatformVersion, latestVersion);

    core.debug('BEFORE: check file change count');
    // check if there are files that are changed
    const filesChanged: number = await checkFileChangeCount();
    core.debug('AFTER: check file change count');

    // If there are *NO* files that have changed, exit; we are done.
    if (filesChanged === 0) {
      core.info('No files have changed, must be on latest version!');
      return;
    }

    // Commit the outstanding files
    core.debug('ABOUT TO COMMIT');
    const newBranchName = `ChrisCarini/upgradeIntelliJ-${latestVersion}`;

    const githubToken = core.getInput('PAT_TOKEN_FOR_IJ_UPDATE_ACTION');
    core.setSecret(githubToken);
    const octokit = github.getOctokit(githubToken);

    core.info(`github.context:`);
    core.info(github.context.eventName);
    core.info(`github.context.eventName: ${github.context.eventName}`);

    // if (github.context.eventName === 'push') {
    //   const pushPayload = github.context.payload as PushEvent
    //   core.info(`The head commit is: ${pushPayload.head_commit}`)
    //   let owner = pushPayload.repository.owner
    //   let repo_name = pushPayload.repository.name
    // }
    if (github.context.eventName === 'workflow_dispatch') {
      const workflowDispatchPayload = github.context.payload as WorkflowDispatchEvent;
      // core.info(`workflowDispatchPayload:`)
      // core.info(JSON.stringify(workflowDispatchPayload))
      const owner = workflowDispatchPayload.repository.owner.login;
      const repo = workflowDispatchPayload.repository.name;

      core.info(`owner: ${owner}`);
      core.info(`repo:  ${repo}`);
    }
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    core.info(`owner: ${owner}`);
    core.info(`repo:  ${repo}`);

    const currentRemoteBranches = await octokit.rest.repos.listBranches({
      owner,
      repo,
    });
    // core.debug(`currentRemoteBranches: ${currentRemoteBranches}`)
    // core.debug(JSON.stringify(currentRemoteBranches))

    const currentRemoteBranchNames = currentRemoteBranches.data.map((obj) => obj.name);
    core.debug(`currentRemoteBranchNames: ${currentRemoteBranchNames}`);

    const currentPullRequests = await octokit.rest.pulls.list({
      owner,
      repo,
    });
    // core.debug(`currentPullRequests: ${currentPullRequests}`)
    // core.debug(JSON.stringify(currentPullRequests))
    const currentPullRequestBranchNames = currentPullRequests.data.map((obj) => obj.head.ref);
    core.debug(`currentPullRequestBranchNames: ${currentPullRequestBranchNames}`);

    if (currentRemoteBranchNames.includes(newBranchName) && currentPullRequestBranchNames.includes(newBranchName)) {
      core.debug(`${newBranchName} - BRANCH ALREADY EXISTS ON REMOTE`);
      core.debug(`${newBranchName} - BRANCH ALREADY HAS A PR OPEN`);
      return;
    }

    if (!currentRemoteBranchNames.includes(newBranchName)) {
      core.debug(`${newBranchName} - BRANCH DOES NOT EXIST; CREATE & PUSH`);
      await simpleGit()
        .exec(() => core.debug(`Starting [git checkout ${newBranchName}]...`))
        .checkoutLocalBranch(newBranchName)
        .exec(() => core.debug(`Starting [git config] configurations...`))
        .addConfig('http.sslVerify', 'false')
        .addConfig('user.name', 'ChrisCarini')
        .addConfig('user.email', '6374067+chriscarini@users.noreply.github.com')
        .exec(() => core.debug(`Starting [git commit -m "Upgrading IntelliJ to ${latestVersion}"]...`))
        .commit(`Upgrading IntelliJ to ${latestVersion}`)
        .exec(() => core.debug(`Finished [git commit -m "Upgrading IntelliJ to ${latestVersion}"]...`))
        .exec(() => core.debug(`Before [git push -u origin ${newBranchName}"]..`))
        .push(['-u', 'origin', newBranchName])
        .exec(() => core.debug(`After [git push -u origin ${newBranchName}"]...`));

      core.debug(`PUSHED BRANCH [${newBranchName}]!!!`);
    }

    const prBody = `
# Upgrading IntelliJ to ${latestVersion}

You can find the change log here: ${releaseInfo.notesLink}

# What's New?
${releaseInfo.whatsnew}
    `;

    if (!currentPullRequestBranchNames.includes(newBranchName)) {
      core.debug(`${newBranchName} - PR DOES NOT EXIST; CREATE`);
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Upgrading IntelliJ to ${latestVersion}`,
        body: prBody,
        head: newBranchName,
        base: 'master',
      });
      core.debug(`OPENED PR FOR BRANCH [${newBranchName}]!!!`);
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
    throw error;
  }
}

run()
  .then(() => {})
  .catch((err) => {
    core.setFailed(err.message);
    core.debug(err);
  });
