// js/chrome-api.js (새 파일)

// chrome.storage.sync.get을 Promise로 감싸는 래퍼
export function storageSyncGet(keys) {
	return new Promise((resolve) => {
		chrome.storage.sync.get(keys, (items) => resolve(items));
	});
}

// chrome.storage.sync.set을 Promise로 감싸는 래퍼
export function storageSyncSet(items) {
	return new Promise((resolve) => {
		chrome.storage.sync.set(items, () => resolve());
	});
}
