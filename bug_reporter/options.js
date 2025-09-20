const DB_NAME = "BugReportDB"; // DB 이름을 상수로 정의

// 옵션을 저장하는 함수
function saveOptions() {
	const userName = document.getElementById("userName").value;
	const userEmail = document.getElementById("userEmail").value;
	const resolution = document.querySelector(
		'input[name="resolution"]:checked'
	).value;

	chrome.storage.sync.get("issueCounter", (data) => {
		const currentCounter =
			data.issueCounter === undefined ? 0 : data.issueCounter;
		chrome.storage.sync.set(
			{
				userName: userName,
				userEmail: userEmail,
				captureWidth: resolution,
				issueCounter: currentCounter,
			},
			() => {
				const status = document.getElementById("status");
				status.textContent = "옵션이 저장되었습니다.";
				setTimeout(() => {
					status.textContent = "";
				}, 1500);
			}
		);
	});
}

// 저장된 옵션을 불러와 화면에 복원하는 함수
function restoreOptions() {
	chrome.storage.sync.get(
		{
			userName: "",
			userEmail: "",
			captureWidth: "1200",
		},
		(items) => {
			document.getElementById("userName").value = items.userName;
			document.getElementById("userEmail").value = items.userEmail;
			document.querySelector(
				`input[name="resolution"][value="${items.captureWidth}"]`
			).checked = true;
		}
	);
}

// --- 데이터베이스 초기화 ---
function resetDatabase() {
	// 1. 사용자에게 정말 삭제할 것인지 최종 확인
	if (
		confirm(
			"정말로 저장된 모든 리포트 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
		)
	) {
		// 2. IndexedDB 데이터베이스 삭제 요청
		const request = indexedDB.deleteDatabase(DB_NAME);

		request.onsuccess = () => {
			alert(
				"모든 리포트 데이터가 성공적으로 삭제되었습니다. 이슈 카운터도 초기화합니다."
			);
			// 이슈 카운터도 0으로 초기화
			chrome.storage.sync.set({ issueCounter: 0 });
			console.log(`${DB_NAME} has been deleted.`);
		};

		request.onerror = (e) => {
			alert("데이터 삭제 중 오류가 발생했습니다.");
			console.error("Error deleting database:", e.target.error);
		};

		// 3. 다른 탭에서 DB를 사용 중이라 삭제가 '차단'될 경우 처리
		request.onblocked = () => {
			alert(
				"데이터베이스 연결이 다른 탭에서 열려 있어 삭제할 수 없습니다.\n열려 있는 '저장된 리포트 목록' 탭을 모두 닫고 다시 시도해주세요."
			);
			console.warn(`${DB_NAME} delete blocked.`);
		};
	}
}

// 이벤트 리스너 연결
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("saveBtn").addEventListener("click", saveOptions);
document.getElementById("resetDbBtn").addEventListener("click", resetDatabase);
