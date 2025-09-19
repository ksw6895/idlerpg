const STORAGE_KEY = 'lumin-grove-save-v1';

function isStorageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

export function loadGame() {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('세이브 데이터를 불러오지 못했습니다.', error);
    return null;
  }
}

export function saveGame(state) {
  if (!isStorageAvailable()) return false;
  try {
    const payload = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (error) {
    console.warn('세이브 데이터를 저장하지 못했습니다.', error);
    return false;
  }
}

export function clearGame() {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('세이브 데이터를 삭제하지 못했습니다.', error);
  }
}
