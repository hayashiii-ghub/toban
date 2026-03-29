/**
 * localStorage の安全なラッパー
 * private browsing やストレージ無効時に例外を投げないようにする
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[storage] localStorageの読み取りに失敗 (key: ${key}):`, error);
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[storage] localStorageの書き込みに失敗 (key: ${key}):`, error);
  }
}
