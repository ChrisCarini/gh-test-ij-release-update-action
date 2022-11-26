import * as core from '@actions/core';
import { parseSemver, ZERO_SEMVER } from './jetbrains/versions';


async function run(): Promise<void> {
  const pluginVerifierIdeVersions = '2022.2.1,2022.2.2,LATEST-EAP-SNAPSHOT';
  const currentPluginVerifierIdeVersions = pluginVerifierIdeVersions
    .split(',')
    .map((v) => {
      core.info(v);
      const semVer = parseSemver(v);
      core.info(JSON.stringify(semVer));
      return semVer;
    })
    .filter((v) => {
      if (v.compare(ZERO_SEMVER)) {
        return true;
      }
      return false;
    });
  core.debug(`currentPluginVerifierIdeVersions: ${currentPluginVerifierIdeVersions}`);
  core.debug(
    `highest: ${currentPluginVerifierIdeVersions
      .sort((a, b) => {
        return -1 * a.compare(b);
      })
      .at(0)}`
  );
}

run();
