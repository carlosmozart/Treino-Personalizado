import { expect, test } from 'vitest';
import { compareVersions } from './version';

test('compara numericamente, não como texto', () => {
  expect(compareVersions('2.20.10', '2.20.9')).toBe(1);
  expect(compareVersions('2.9.0', '2.10.0')).toBe(-1);
});

test('ignora prefixo, pré-lançamento e metadados', () => {
  expect(compareVersions('v3.0.0', '2.21.1')).toBe(1);
  expect(compareVersions('3.0.0-dev', '3.0.0')).toBe(0);
  expect(compareVersions('2.21.1+build.7', '2.21.1')).toBe(0);
});

test('partes ausentes valem zero', () => {
  expect(compareVersions('3', '3.0.0')).toBe(0);
  expect(compareVersions('3.1', '3.0.9')).toBe(1);
});
