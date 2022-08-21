import * as core from '@actions/core';
import * as httpClient from '@actions/http-client';

export interface JetBrainsProductReleaseInfo {
  date: string;
  type: string;
  // downloads: {},
  // patches: {},
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

    return ides['IIU'] as JetBrainsProductReleaseInfo;
  } catch (error) {
    core.setFailed('Error getting the latest version of IntelliJ. Exiting.');
    if (error instanceof Error) core.setFailed(error.message);
    return process.exit(1);
  }
}

async function run(): Promise<void> {
  // get the latest intellij release
  const resp: JetBrainsProductReleaseInfo = await getLatestIntellijReleaseInfo();
  console.log(resp);
}

run();
