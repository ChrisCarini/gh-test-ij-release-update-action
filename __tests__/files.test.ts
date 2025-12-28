import { jest } from '@jest/globals';
import { _next_plugin_version } from '../src/jetbrains/files';
import * as semver from 'semver';
import * as versions from '../src/jetbrains/versions';

jest.mock('@actions/core');

describe('_next_plugin_version', () => {
  it('[patch] update 0.2.6 -> 0.2.7 for 2022.3.2 -> 2022.3.3', () => {
    const result = _next_plugin_version(
      versions.parseSemver('0.2.6'),
      versions.parseSemver('2022.3.2'),
      versions.parseSemver('2022.3.3')
    );
    expect(result).toStrictEqual(semver.parse('0.2.7'));
  });

  it('[patch] update 2.0.0 -> 2.0.1 for 2025.1.0 -> 2025.1.1', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.0.0'),
      versions.parseSemver('2025.1.0'),
      versions.parseSemver('2025.1.1')
    );
    expect(result).toStrictEqual(semver.parse('2.0.1'));
  });

  it('[patch] update 2.1.0 -> 2.1.1 for 2025.2.0 -> 2025.2.1', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.1.0'),
      versions.parseSemver('2025.2'),
      versions.parseSemver('2025.2.1')
    );
    expect(result).toStrictEqual(semver.parse('2.1.1'));
  });

  it('[minor] update 0.2.6 -> 0.3.0 for 2022.1.1 -> 2022.2.0', () => {
    const result = _next_plugin_version(
      versions.parseSemver('0.2.6'),
      versions.parseSemver('2022.1.1'),
      versions.parseSemver('2022.2.0')
    );
    expect(result).toStrictEqual(semver.parse('0.3.0'));
  });

  it('[minor] update 2.0.4 -> 2.1.0 for 2025.1.4 -> 2025.2.0', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.0.4'),
      versions.parseSemver('2025.1.4'),
      versions.parseSemver('2025.2.0')
    );
    expect(result).toStrictEqual(semver.parse('2.1.0'));
  });

  it('[major] update 0.2.6 -> 1.0.0 for 2022.3.2 -> 2023.1.0', () => {
    const result = _next_plugin_version(
      versions.parseSemver('0.2.6'),
      versions.parseSemver('2022.3.2'),
      versions.parseSemver('2023.1.0')
    );
    expect(result).toStrictEqual(semver.parse('1.0.0'));
  });

  it('[major] update 2.1.2 -> 3.0.0 for 2025.3.4 -> 2026.1.0', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.1.2'),
      versions.parseSemver('2025.3.4'),
      versions.parseSemver('2026.1.0')
    );
    expect(result).toStrictEqual(semver.parse('3.0.0'));
  });

  it('[confusing] update 2.0.0 -> 2.0.1 for 2025.1 -> 2025.1.1', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.0.0'),
      versions.parseSemver('2025.1'),
      versions.parseSemver('2025.1.1')
    );
    expect(result).toStrictEqual(semver.parse('2.0.1'));
  });

  it('[confusing] update 2.0.0 -> 2.0.1 for 2025.1 -> 2025.1.1.1', () => {
    const result = _next_plugin_version(
      versions.parseSemver('2.0.0'),
      versions.parseSemver('2025.1'),
      versions.parseSemver('2025.1.1.1')
    );
    expect(result).toStrictEqual(semver.parse('2.0.1'));
  });
});
