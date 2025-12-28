import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core';
import * as semver from 'semver';

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core);

const { getLatestIntellijReleaseInfo, formatVersion, parseSemver, ZERO_SEMVER } =
  await import('../src/jetbrains/versions');

describe('parseSemver', () => {
  it('should return ZERO_SEMVER when input is undefined', () => {
    const result = parseSemver(undefined);
    expect(core.setFailed).toHaveBeenCalledWith('Input to parse SemVer is undefined.');
    expect(result).toBe(ZERO_SEMVER);
  });

  it('should parse valid semantic version input - 1.2.3', () => {
    const result = parseSemver('1.2.3');
    expect(result.version).toBe('1.2.3');
  });

  it('should add `.0` to input with one dot and parse correctly', () => {
    const result = parseSemver('2022.2');
    expect(result.version).toBe('2022.2.0');
  });

  it('2025.1 should parse to 2025.1.0', () => {
    const result = parseSemver('2025.1');
    expect(result.version).toBe('2025.1.0');
  });

  it('2025.1.1 should parse to 2025.1.1', () => {
    const result = parseSemver('2025.1.1');
    expect(result.version).toBe('2025.1.1');
  });

  it('2025.1.1.1 should parse to 2025.1.1-1', () => {
    const result = parseSemver('2025.1.1.1');
    expect(result.version).toBe('2025.1.1-1');
  });

  it('2025.1.1 != 2025.1 (2025.1.0)', () => {
    const a = parseSemver('2025.1.1');
    const b = parseSemver('2025.1');
    expect(semver.eq(a, b)).toBeFalsy();
  });

  it('2025.1.0 < 2025.1.1.1', () => {
    const a = parseSemver('2025.1');
    const b = parseSemver('2025.1.1.1');
    expect(semver.lt(a, b)).toBeTruthy();
  });

  it('not_a_valid_version', () => {
    const result = parseSemver('not_a_valid_version');
    expect(result).toBe(ZERO_SEMVER);
  });
});
describe('formatVersion', () => {
  it('should leave 1.2.3 untouched', () => {
    const result = formatVersion(new semver.SemVer('1.2.3'));
    expect(result).toBe('1.2.3');
  });

  it('should remove the last `.0` from 2.1.0', () => {
    const result = formatVersion(new semver.SemVer('2.1.0'));
    expect(result).toBe('2.1');
  });
});
describe('getLatestIntellijReleaseInfo', () => {
  it('should handle a successful call w/ valid data', async () => {
    const result = await getLatestIntellijReleaseInfo();
    expect(semver.gte(parseSemver(result.version), parseSemver('2025.1.1.1'))).toBeTruthy(); // as of 2025-05-14
    expect(semver.gte(parseSemver(result.majorVersion), parseSemver('2025.1'))).toBeTruthy(); // as of 2025-05-14
    expect(result.licenseRequired).toBeTruthy(); // as of 2025-05-14
    expect(result.type).toBe('release');
  });

  it('should handle an error when client.get() fails', async () => {
    // Mock the HTTP client to simulate a network failure.
    const httpClientMock = jest
      .spyOn((await import('@actions/http-client')).HttpClient.prototype, 'get')
      .mockRejectedValue(new Error('Mocked network error'));

    // Mock the core.setFailed method to capture the failure output
    const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation(() => {});

    await expect(getLatestIntellijReleaseInfo()).rejects.toThrow('Mocked network error');

    expect(setFailedMock).toHaveBeenCalledWith('Error getting the latest version of IntelliJ. Exiting.');

    // Clean up mocks
    httpClientMock.mockRestore();
    setFailedMock.mockRestore();
  });
});
