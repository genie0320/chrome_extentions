import * as exporter from "./exporter.js";

document.addEventListener("DOMContentLoaded", () => {
	const DB_NAME = "BugReportDB";
	const STORE_NAME = "reports";
	const STATUS_OPTIONS = [
		"접수완료",
		"협의필요",
		"개발중",
		"완료",
		"백로그",
		"폐기",
	];
	let db;
	let allReports = [];
	let currentlyRenderedReports = [];

	// --- 1. DOM 요소 가져오기 ---
	const tableBody = document.getElementById("report-table-body");
	const noReportsMsg = document.getElementById("no-reports");
	const searchInput = document.getElementById("searchInput");
	const statusFiltersContainer = document.getElementById("statusFilters");
	const modal = document.getElementById("editModal");
	const closeModalBtn = modal.querySelector(".close-btn");
	const modalSaveBtn = document.getElementById("modalSaveBtn");
	const exportMenu = document.getElementById("exportMenu");

	// --- 2. DB 초기화 ---
	function initDb() {
		console.log("DB 초기화를 시작합니다.");
		const request = indexedDB.open(DB_NAME, 2);
		request.onerror = (e) => console.error("DB Error:", e.target.errorCode);
		request.onsuccess = (e) => {
			console.log("DB가 성공적으로 연결되었습니다.");
			db = e.target.result;
			loadReports();
		};
		request.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (e.oldVersion < 2) {
				// ★★★ 기본 키를 'uniqueId'로 사용하는 새로운 저장소 생성 ★★★
				if (db.objectStoreNames.contains(STORE_NAME)) {
					db.deleteObjectStore(STORE_NAME);
				}
				db.createObjectStore(STORE_NAME, { keyPath: "uniqueId" });
			}
		};
	}

	// --- 3. 데이터 로딩 및 화면 렌더링 ---
	function loadReports() {
		if (!db) return;
		const transaction = db.transaction([STORE_NAME], "readonly");
		const store = transaction.objectStore(STORE_NAME);
		store.getAll().onsuccess = (e) => {
			allReports = e.target.result.reverse();
			console.log(`${allReports.length}개의 리포트를 불러왔습니다.`);
			renderStatusFilters();
			applyFiltersAndRender();
			displayLastExportTime(); // 마지막 내보내기 시간 표시 함수 호출
		};
	}

	function renderStatusFilters() {
		statusFiltersContainer.innerHTML = "";
		["전체", ...STATUS_OPTIONS].forEach((status, index) => {
			const button = document.createElement("button");
			button.textContent = status;
			button.dataset.status = status === "전체" ? "all" : status;
			if (index === 0) button.className = "active";
			statusFiltersContainer.appendChild(button);
		});
	}

	function applyFiltersAndRender() {
		const searchTerm = searchInput.value.toLowerCase();
		const activeStatusFilter =
			statusFiltersContainer.querySelector(".active").dataset.status;
		let filteredReports = allReports;

		if (activeStatusFilter !== "all") {
			filteredReports = filteredReports.filter(
				(r) => (r.status || "접수완료") === activeStatusFilter
			);
		}
		if (searchTerm) {
			filteredReports = filteredReports.filter(
				(r) =>
					(r.title || "").toLowerCase().includes(searchTerm) ||
					(r.problem || "").toLowerCase().includes(searchTerm) ||
					(r.expected || "").toLowerCase().includes(searchTerm)
			);
		}
		renderTable(filteredReports);
	}

	function renderTable(reports) {
		currentlyRenderedReports = reports;
		tableBody.innerHTML = "";
		noReportsMsg.style.display = reports.length === 0 ? "block" : "none";
		reports.forEach((report) => {
			const reportNumber = allReports.findIndex((r) => r.id === report.id);
			const row = createReportRow(report, allReports.length - reportNumber);
			tableBody.appendChild(row);
		});
	}

	// 'TODO_NOW' g현재 '보기/수정' 버튼, '삭제'버튼 작동안함.
	function createReportRow(report, displayIndex) {
		const row = document.createElement("tr");
		// ★★★ data-id에 report.id 대신 report.uniqueId를 저장 ★★★
		row.dataset.id = report.uniqueId;
		row.innerHTML = `
        <td class="col-no">${displayIndex}</td>
        <td class="col-date">${new Date(
					report.createdAt
				).toLocaleDateString()}</td>
        <td class="col-category">${report.category || ""}</td>
        <td class="col-title">${report.title || "(제목 없음)"}</td>
        <td class="col-problem" title="${report.problem}">${
			report.problem || ""
		}</td>
        <td class="col-manage">
        <button class="view-btn">보기/수정</button>
        <button class="delete-btn">삭제</button>
        </td>
        <td class="col-status">
        <select class="status-select">
            ${STATUS_OPTIONS.map(
							(opt) =>
								`<option value="${opt}" ${
									(report.status || "접수완료") === opt ? "selected" : ""
								}>${opt}</option>`
						).join("")}
        </select>
        </td>
    `;
		return row;
	}

	function displayLastExportTime() {
		chrome.storage.sync.get("lastExportTime", (data) => {
			const timeEl = document.getElementById("lastExportTime");
			if (data.lastExportTime) {
				timeEl.textContent = new Date(data.lastExportTime).toLocaleString();
			} else {
				timeEl.textContent = "기록 없음";
			}
		});
	}

	// --- 4. 이벤트 핸들러 및 데이터 관리 ---
	function handleTableInteraction(e) {
		const target = e.target;
		const row = target.closest("tr");
		if (!row) return;
		const id = row.dataset.id;

		if (target.classList.contains("view-btn")) {
			openModal(id);
		} else if (target.classList.contains("delete-btn")) {
			deleteReport(id);
		} else if (target.classList.contains("status-select")) {
			updateReportStatus(id, target.value);
		}
	}

	function openModal(id) {
		const report = allReports.find((r) => r.id === id);
		if (!report) return;
		modal.querySelector("#modalReportId").value = report.id;
		modal.querySelector("#modalImage").src = report.imageData;
		modal.querySelector("#modalCategory").value = report.category;
		modal.querySelector("#modalTitle").value = report.title;
		modal.querySelector("#modalProblem").textContent = report.problem;
		modal.querySelector("#modalExpected").textContent = report.expected;
		modal.style.display = "block";
	}

	function closeModal() {
		modal.style.display = "none";
	}

	function saveModalChanges() {
		const id = parseInt(modal.querySelector("#modalReportId").value, 10);
		const report = allReports.find((r) => r.id === id);
		if (!report) return;
		report.category = modal.querySelector("#modalCategory").value;
		report.title = modal.querySelector("#modalTitle").value;
		report.problem = modal.querySelector("#modalProblem").value;
		report.expected = modal.querySelector("#modalExpected").value;
		const transaction = db.transaction([STORE_NAME], "readwrite");
		transaction.objectStore(STORE_NAME).put(report).onsuccess = () => {
			alert("수정되었습니다.");
			closeModal();
			applyFiltersAndRender();
		};
	}

	function updateReportStatus(id, newStatus) {
		const report = allReports.find((r) => r.id === id);
		if (report) {
			report.status = newStatus;
			const transaction = db.transaction([STORE_NAME], "readwrite");
			transaction.objectStore(STORE_NAME).put(report);
		}
	}

	function deleteReport(id) {
		if (!confirm("정말 삭제하시겠습니까?")) return;
		db
			.transaction([STORE_NAME], "readwrite")
			.objectStore(STORE_NAME)
			.delete(id).onsuccess = loadReports;
	}

	// --- 5. 이벤트 리스너 연결 ---
	searchInput.addEventListener("input", applyFiltersAndRender);
	statusFiltersContainer.addEventListener("click", (e) => {
		if (e.target.tagName === "BUTTON") {
			statusFiltersContainer
				.querySelector(".active")
				.classList.remove("active");
			e.target.classList.add("active");
			applyFiltersAndRender();
		}
	});
	tableBody.addEventListener("click", handleTableInteraction);
	tableBody.addEventListener("change", handleTableInteraction);
	closeModalBtn.addEventListener("click", closeModal);
	modalSaveBtn.addEventListener("click", saveModalChanges);
	window.addEventListener("click", (e) => {
		if (e.target === modal) closeModal();
	});

	exportMenu.addEventListener("click", async (e) => {
		e.preventDefault();
		const format = e.target.dataset.format;
		const exportType = e.target.dataset.exportType;
		if (!format || !exportType) return;
		let reportsToExport = [];
		let isNewExport = false;

		switch (exportType) {
			case "current":
				reportsToExport = currentlyRenderedReports;
				break;
			case "new":
				const data = await chrome.storage.sync.get("lastExportTime");
				reportsToExport = data.lastExportTime
					? allReports.filter(
							(r) => new Date(r.createdAt) > new Date(data.lastExportTime)
					  )
					: allReports;
				isNewExport = true;
				break;
			case "all":
				reportsToExport = allReports;
				break;
		}

		if (reportsToExport.length === 0) {
			alert("내보낼 리포트가 없습니다.");
			return;
		}

		const exportBtn = document.getElementById("exportBtn");
		const originalText = exportBtn.textContent;
		exportBtn.textContent = "처리 중...";
		exportBtn.disabled = true;

		try {
			switch (format) {
				case "excel":
					await exporter.exportToExcelZip(
						reportsToExport,
						window.JSZip,
						window.XLSX
					);
					if (isNewExport) {
						const now = new Date().toISOString();
						chrome.storage.sync.set({ lastExportTime: now }, () => {
							displayLastExportTime();
						});
					}
					break;
				case "google-sheet":
					exporter.exportToGoogleSheet(reportsToExport);
					break;
			}
		} catch (error) {
			alert(error.message);
		} finally {
			exportBtn.textContent = originalText;
			exportBtn.disabled = false;
		}
	});

	// --- 6. 초기 실행 ---
	initDb();
});
