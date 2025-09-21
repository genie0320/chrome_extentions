import { DB_NAME, STORE_NAME } from "./constants.js";

let db;

// DB를 열고 인스턴스를 반환하는 함수
async function getDb() {
	if (db) return db;
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 2);
		request.onerror = (e) => reject("DB Error: " + e.target.errorCode);
		request.onsuccess = (e) => {
			db = e.target.result;
			resolve(db);
		};
		request.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (e.oldVersion < 2) {
				if (db.objectStoreNames.contains(STORE_NAME)) {
					db.deleteObjectStore(STORE_NAME);
				}
				db.createObjectStore(STORE_NAME, { keyPath: "uniqueId" });
			}
		};
	});
}

// 모든 리포트를 가져오는 함수
export async function getAllReports() {
	const db = await getDb();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.getAll();
		request.onerror = (e) =>
			reject("Error fetching reports: " + e.target.error);
		request.onsuccess = (e) => resolve(e.target.result.reverse());
	});
}

// 리포트를 저장/수정하는 함수
export async function saveReport(report) {
	const db = await getDb();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(report);
		request.onerror = (e) => reject("Error saving report: " + e.target.error);
		request.onsuccess = () => resolve();
	});
}

// 리포트를 삭제하는 함수
export async function deleteReport(id) {
	const db = await getDb();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(id);
		request.onerror = (e) => reject("Error deleting report: " + e.target.error);
		request.onsuccess = () => resolve();
	});
}

export async function updateReport(report) {
	const db = await getDb();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(report);
		request.onerror = (e) => reject("Error updating report: " + e.target.error);
		request.onsuccess = () => resolve();
	});
}

// ...
// DB를 완전히 삭제하는 함수
export function deleteDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = (e) =>
			reject("Error deleting database: " + e.target.error);
		request.onblocked = () => reject("Database delete blocked");
	});
}
