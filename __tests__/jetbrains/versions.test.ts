/**
 * Unit tests for src/jetbrains/files.ts
 */

// import {_next_plugin_version} from '../../src/jetbrains/files'
import * as files from '../../src/jetbrains/files';
import { expect } from '@jest/globals';
import semver = require('semver/preload');

describe('files.ts', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(files, '_inc_version'); // Set up the spy before each test
  });

  afterEach(() => {
    spy.mockRestore(); // Restore the original implementation after each test
  });

  it.each([
    // -----------------------------------------------
    // ACTUAL UPGRADE PATH OF `sample-intellij-plugin`
    // -----------------------------------------------
    // ["minor" as semver.ReleaseType, "2022.2", "2022.3.0", "0.2.9", "0.3.0"], // I manually did this release, so the version bump from this GHA did not apply at the time. Oops.
    ['patch' as semver.ReleaseType, '2022.3.0', '2022.3.1', '0.3.0', '0.3.1'],
    ['patch' as semver.ReleaseType, '2022.3.1', '2022.3.2', '0.3.1', '0.3.2'],
    ['patch' as semver.ReleaseType, '2022.3.2', '2022.3.3', '0.3.2', '0.3.3'],
    // ["major" as semver.ReleaseType, "2022.3.3", "2023.1.0", "0.3.3", "0.4.0"], // I manually did this release, so the version bump from this GHA did not apply at the time. Oops.
    ['patch' as semver.ReleaseType, '2023.1.0', '2023.1.1', '0.4.0', '0.4.1'],
    ['patch' as semver.ReleaseType, '2023.1.1', '2023.1.2', '0.4.1', '0.4.2'],
    ['patch' as semver.ReleaseType, '2023.1.2', '2023.1.3', '0.4.2', '0.4.3'],
    ['patch' as semver.ReleaseType, '2023.1.3', '2023.1.4', '0.4.3', '0.4.4'],
    ['patch' as semver.ReleaseType, '2023.1.4', '2023.1.5', '0.4.4', '0.4.5'],
    ['minor' as semver.ReleaseType, '2023.1.5', '2023.2.0', '0.4.5', '0.5.0'],
    ['patch' as semver.ReleaseType, '2023.2.0', '2023.2.1', '0.5.0', '0.5.1'],
    ['patch' as semver.ReleaseType, '2023.2.1', '2023.2.2', '0.5.1', '0.5.2'],
    ['patch' as semver.ReleaseType, '2023.2.2', '2023.2.3', '0.5.2', '0.5.3'],
    ['patch' as semver.ReleaseType, '2023.2.3', '2023.2.4', '0.5.3', '0.5.4'],
    ['patch' as semver.ReleaseType, '2023.2.4', '2023.2.5', '0.5.4', '0.5.5'],
    ['minor' as semver.ReleaseType, '2023.2.5', '2023.3.0', '0.5.5', '0.6.0'],
    ['patch' as semver.ReleaseType, '2023.3.0', '2023.3.1', '0.6.0', '0.6.1'],
    ['patch' as semver.ReleaseType, '2023.3.1', '2023.3.2', '0.6.1', '0.6.2'],
    ['patch' as semver.ReleaseType, '2023.3.2', '2023.3.3', '0.6.2', '0.6.3'],
    ['patch' as semver.ReleaseType, '2023.3.3', '2023.3.4', '0.6.3', '0.6.4'],
    ['patch' as semver.ReleaseType, '2023.3.4', '2023.3.5', '0.6.4', '0.6.5'],
    ['patch' as semver.ReleaseType, '2023.3.5', '2023.3.6', '0.6.5', '0.6.6'],
    ['major' as semver.ReleaseType, '2023.3.6', '2024.1.0', '0.6.6', '1.0.0'],
    ['patch' as semver.ReleaseType, '2024.1.0', '2024.1.1', '1.0.0', '1.0.1'],
    ['patch' as semver.ReleaseType, '2024.1.1', '2024.1.2', '1.0.1', '1.0.2'],
    ['patch' as semver.ReleaseType, '2024.1.2', '2024.1.3', '1.0.2', '1.0.3'],
    ['patch' as semver.ReleaseType, '2024.1.3', '2024.1.4', '1.0.3', '1.0.4'],
    ['patch' as semver.ReleaseType, '2024.1.4', '2024.1.5', '1.0.4', '1.0.5'],

    // ["minor" as semver.ReleaseType, "2024.1.5", "2024.2.1", "1.0.5", "1.1.1"], // The actual upgrade covered two versions, so this test is 'invalid'. Broke apart into two below.
    ['minor' as semver.ReleaseType, '2024.1.5', '2024.2.0', '1.0.5', '1.1.0'],
    ['patch' as semver.ReleaseType, '2024.2.0', '2024.2.1', '1.1.0', '1.1.1'],

    ['patch' as semver.ReleaseType, '2024.2.1', '2024.2.2', '1.1.1', '1.1.2'],
    ['patch' as semver.ReleaseType, '2024.2.2', '2024.2.3', '1.1.2', '1.1.3'],
    ['patch' as semver.ReleaseType, '2024.2.3', '2024.2.4', '1.1.3', '1.1.4'],
    ['minor' as semver.ReleaseType, '2024.2.4', '2024.3.0', '1.1.4', '1.2.0'],
    ['patch' as semver.ReleaseType, '2024.3.0', '2024.3.1', '1.2.0', '1.2.1'],
    ['patch' as semver.ReleaseType, '2024.3.1', '2024.3.1.1', '1.2.1', '1.2.2'], // 4 part version!
    // ---------------------------------------------------
    // END ACTUAL UPGRADE PATH OF `sample-intellij-plugin`
    // ---------------------------------------------------

    // ---------------------------
    // FROM EXAMPLES IN THE METHOD
    // ---------------------------
    ['major' as semver.ReleaseType, '2022.3.2', '2023.1.0', '0.2.6', '1.0.0'],
    ['minor' as semver.ReleaseType, '2023.1.1', '2023.2.0', '0.2.6', '0.3.0'],
    ['patch' as semver.ReleaseType, '2022.3.2', '2022.3.3', '0.2.6', '0.2.7'],
    ['patch' as semver.ReleaseType, '2024.3.1', '2024.3.1.1', '0.2.6', '0.2.7'],
    // -------------------------------
    // END FROM EXAMPLES IN THE METHOD
    // -------------------------------
  ])(
    'a %p platform update from %p to %p bumps the plugin version from %p to %p',
    (
      releaseType: semver.ReleaseType,
      currentPlatform: string,
      newPlatform: string,
      startingPluginVersion: string,
      expectedPluginVersion: string
    ) => {
      // given
      const pluginVersion = new semver.SemVer(startingPluginVersion);

      // when
      const nextPluginVersion = files._next_plugin_version(pluginVersion, currentPlatform, newPlatform);

      // then
      expect(nextPluginVersion).toEqual(new semver.SemVer(expectedPluginVersion));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(pluginVersion, releaseType);
    }
  );
});
