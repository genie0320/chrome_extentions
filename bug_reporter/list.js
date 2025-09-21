// list.js (리팩토링 최종본)

import * as db from "./js/db.js";
import * as exporter from "./exporter.js";
import { STATUS_OPTIONS } from "./js/constants.js";
import { storageSyncGet, storageSyncSet } from "./js/chrome-api.js";

document.addEventListener("DOMContentLoaded", () => {
	let allReports = [];
	let currentlyRenderedReports = [];

	// --- 1. DOM 요소 가져오기 ---
	const tableBody = document.getElementById("report-table-body");
	const noReportsMsg = document.getElementById("no-reports");
	const searchInput = document.getElementById("searchInput");
	const statusFiltersContainer = document.getElementById("statusFilters");
	const modal = document.getElementById("editModal");
	const exportMenu = document.getElementById("exportMenu");

	// --- 2. 렌더링 함수들 ---
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

	function renderTable(reports) {
		currentlyRenderedReports = reports;
		tableBody.innerHTML = "";
		noReportsMsg.style.display = reports.length === 0 ? "block" : "none";
		reports.forEach((report) => {
			const reportNumber = allReports.findIndex(
				(r) => r.uniqueId === report.uniqueId
			);
			const row = createReportRow(report, allReports.length - reportNumber);
			tableBody.appendChild(row);
		});
	}

	function createReportRow(report, displayIndex) {
		const row = document.createElement("tr");
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
													(report.status || "접수완료") === opt
														? "selected"
														: ""
												}>${opt}</option>`
										).join("")}
                </select>
            </td>
        `;
		return row;
	}

	async function displayLastExportTime() {
		const data = await storageSyncGet("lastExportTime");
		const timeEl = document.getElementById("lastExportTime");
		timeEl.textContent = data.lastExportTime
			? new Date(data.lastExportTime).toLocaleString()
			: "기록 없음";
	}

	// --- 3. 필터링 로직 ---
	function applyFiltersAndRender() {
		const searchTerm = searchInput.value.toLowerCase();
		const activeStatusFilter =
			statusFiltersContainer.querySelector(".active").dataset.status;
		let filtered = allReports;

		if (activeStatusFilter !== "all") {
			filtered = filtered.filter(
				(r) => (r.status || "접수완료") === activeStatusFilter
			);
		}
		if (searchTerm) {
			filtered = filtered.filter(
				(r) =>
					(r.title || "").toLowerCase().includes(searchTerm) ||
					(r.problem || "").toLowerCase().includes(searchTerm)
			);
		}
		renderTable(filtered);
	}

	// --- 4. 이벤트 핸들러 ---
	function handleFilterClick(e) {
		if (e.target.tagName === "BUTTON") {
			statusFiltersContainer
				.querySelector(".active")
				.classList.remove("active");
			e.target.classList.add("active");
			applyFiltersAndRender();
		}
	}

	async function handleTableInteraction(e) {
		const row = e.target.closest("tr");
		if (!row) return;
		const id = row.dataset.id;

		if (e.target.classList.contains("view-btn")) {
			openModal(id);
		} else if (e.target.classList.contains("delete-btn")) {
			try {
				await db.deleteReport(id);
				main(); // 삭제 후 목록 새로고침
			} catch (error) {
				if (error !== "Deletion cancelled")
					alert("삭제 중 오류가 발생했습니다.");
			}
		} else if (e.target.classList.contains("status-select")) {
			const report = allReports.find((r) => r.uniqueId === id);
			if (report) {
				report.status = e.target.value;
				await db.updateReport(report);
			}
		}
	}

	function openModal(id) {
		const report = allReports.find((r) => r.uniqueId === id);
		if (!report) return;
		modal.querySelector("#modalReportId").value = report.uniqueId;
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

	async function handleModalSave() {
		const id = modal.querySelector("#modalReportId").value;
		const report = allReports.find((r) => r.uniqueId === id);
		if (!report) return;

		report.category = modal.querySelector("#modalCategory").value;
		report.title = modal.querySelector("#modalTitle").value;
		report.problem = modal.querySelector("#modalProblem").value;
		report.expected = modal.querySelector("#modalExpected").value;

		try {
			await db.updateReport(report);
			alert("수정되었습니다.");
			closeModal();
			applyFiltersAndRender(); // 수정 후 필터링된 화면에 바로 반영
		} catch (error) {
			alert("수정 중 오류가 발생했습니다.");
		}
	}

	async function handleExportClick(e) {
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
				const data = await storageSyncGet("lastExportTime");
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

		if (reportsToExport.length === 0) return alert("내보낼 리포트가 없습니다.");

		const exportBtn = document.getElementById("exportBtn");
		const originalText = exportBtn.textContent;
		exportBtn.textContent = "처리 중...";
		exportBtn.disabled = true;

		try {
			if (format === "excel") {
				await exporter.exportToExcelZip(
					reportsToExport,
					window.JSZip,
					window.XLSX
				);
				if (isNewExport) {
					const now = new Date().toISOString();
					await storageSyncSet({ lastExportTime: now });
					displayLastExportTime();
				}
			}
		} catch (error) {
			alert(error.message);
		} finally {
			exportBtn.textContent = originalText;
			exportBtn.disabled = false;
		}
	}

	function setupEventListeners() {
		searchInput.addEventListener("input", applyFiltersAndRender);
		statusFiltersContainer.addEventListener("click", handleFilterClick);
		tableBody.addEventListener("click", handleTableInteraction);
		tableBody.addEventListener("change", handleTableInteraction);
		modal.querySelector(".close-btn").addEventListener("click", closeModal);
		document
			.getElementById("modalSaveBtn")
			.addEventListener("click", handleModalSave);
		window.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
		exportMenu.addEventListener("click", handleExportClick);
	}

	// --- 5. 애플리케이션 시작 ---
	async function main() {
		try {
			await db.initDb();
			allReports = await db.getAllReports();
			renderStatusFilters();
			applyFiltersAndRender();
			displayLastExportTime();
			setupEventListeners();
			console.log("Bug Reporter List Initialized Successfully!");
		} catch (error) {
			console.error("List page initialization failed:", error);
			alert("리스트 페이지 초기화에 실패했습니다. 콘솔을 확인해주세요.");
		}
	}

	main();
});
