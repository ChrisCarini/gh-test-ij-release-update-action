import * as github from '@actions/github';

// async function run(): Promise<void> {
//   const pluginVerifierIdeVersions = '2022.2.1,2022.2.2,LATEST-EAP-SNAPSHOT';
//   const currentPluginVerifierIdeVersions = pluginVerifierIdeVersions
//     .split(',')
//     .map((v) => {
//       core.info(v);
//       const semVer = parseSemver(v);
//       core.info(JSON.stringify(semVer));
//       return semVer;
//     })
//     .filter((v) => {
//       if (v.compare(ZERO_SEMVER)) {
//         return true;
//       }
//       return false;
//     });
//   core.debug(`currentPluginVerifierIdeVersions: ${currentPluginVerifierIdeVersions}`);
//   core.debug(
//     `highest: ${currentPluginVerifierIdeVersions
//       .sort((a, b) => {
//         return -1 * a.compare(b);
//       })
//       .at(0)}`
//   );
// }
async function run2(): Promise<void> {
  const octokit = github.getOctokit('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');
  const { data } = await octokit.rest.users.getAuthenticated();
  // const email = data.email
  // const username = data.login

  console.log(JSON.stringify(data, null, 2));

  // 6374067+ChrisCarini@users.noreply.github.com
  const email = `${data.id}+${data.login}@users.noreply.github.com`;
  console.log(email);
}

run2();
