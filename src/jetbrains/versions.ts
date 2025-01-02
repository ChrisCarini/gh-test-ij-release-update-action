import * as core from '@actions/core';
import * as httpClient from '@actions/http-client';
import * as semver from 'semver';

export const ZERO_SEMVER_STR = '0.0.0';
export const ZERO_SEMVER = new semver.SemVer(ZERO_SEMVER_STR);

export function parseSemver(input: string | undefined): semver.SemVer {
  if (input === undefined) {
    core.setFailed(`Input to parse SemVer is undefined.`);
    return ZERO_SEMVER;
  }

  // If we only have one dot, assume the input is
  // a major version (ie, 2022.2, aka 2022.2.0) and
  // add a `.0` at the end.
  core.warning(`INPUT: ${input} (type: ${typeof input})`);
  const countDots = (input.match(/\./g) || []).length;
  if (countDots === 1) {
    input = `${input}.0`;
  }

  const parsed = semver.parse(input);
  if (parsed == null) {
    core.error(`Failed to parse ${input} to Semantic Versioning`);
    return ZERO_SEMVER;
  }
  return parsed;
}

/**
 * Format version by removing any `.0` from the end of the version string.
 * @param version
 */
export function formatVersion(version: string): string {
  return version.endsWith('.0') ? version.slice(0, -2) : version;
}

export interface JetBrainsProductReleaseInfo {
  date: string;
  type: string;
  downloads: object;
  patches: object;
  notesLink: string;
  licenseRequired: boolean;
  version: string;
  majorVersion: string;
  build: string;
  whatsnew: string;
  uninstallFeedbackLinks: object;
  printableReleaseType: object;
}

export async function getLatestIntellijReleaseInfo(): Promise<JetBrainsProductReleaseInfo> {
  try {
    // get the latest intellij release
    const client = new httpClient.HttpClient();
    const response: httpClient.HttpClientResponse = await client.get(
      'https://data.services.jetbrains.com/products/releases?code=IIU&latest=true&release.type=release'
    );
    const body: string = await response.readBody();
    const ides = JSON.parse(body);

    core.debug(`ides:`);
    core.debug(JSON.stringify(ides));

    return ides['IIU'][0] as JetBrainsProductReleaseInfo;
  } catch (error) {
    core.setFailed('Error getting the latest version of IntelliJ. Exiting.');
    if (error instanceof Error) core.setFailed(error.message);
    process.exitCode = 1;
    throw error;
  }
}
