import { expect, test } from 'vitest';
import { isIos } from './ios-install';

const ua = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints });

test('reconhece iPhone, iPad (inclusive o que se diz Mac) e ignora Android e Mac de mesa', () => {
  expect(isIos(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'))).toBe(true);
  expect(isIos(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1'))).toBe(true);
  expect(isIos(ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5))).toBe(true);
  expect(isIos(ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0))).toBe(false);
  expect(isIos(ua('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', 5))).toBe(false);
});
