// editor.js (마커 기능이 모두 포함된 최종본)

import { saveReport } from "./js/db.js";
import { resizeImage } from "./js/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
	// Chrome API 래퍼
	const storage = {
		getLocal: (keys) => chrome.storage.local.get(keys),
		removeLocal: (keys) => chrome.storage.local.remove(keys),
		getSync: (keys) => chrome.storage.sync.get(keys),
	};

	const result = await storage.getLocal(["captureData"]);
	if (!result.captureData) return;

	let { capturedImage, resizeWidth, pageUrl, captureTime } = result.captureData;

	// 새로운 고유 ID를 생성합니다. (크롬 API 사용)
	const uniqueId = crypto.randomUUID();

	// --- 1. 폼 자동 채우기 ---
	document.querySelector(
		".issue_id"
	).textContent = `이슈고유번호 : ${uniqueId}`;
	document.getElementById("pageUrl").value = pageUrl;
	document.getElementById("captureTime").value = new Date(
		captureTime
	).toLocaleString();

	if (pageUrl) {
		// 메뉴 자동 분류
		const menuSelect = document.getElementById("menu");
		const channelSelect = document.getElementById("channel");

		// URL에 특정 키워드가 포함되어 있는지 확인하여 `menuSelect`의 값을 설정
		if (pageUrl.includes(":3001")) {
			channelSelect.value = "joonLab";
		} else if (pageUrl.includes(":3002")) {
			channelSelect.value = "joonChart";
		} else if (pageUrl.includes(":3003")) {
			channelSelect.value = "tiom";
		}

		// URL에 특정 키워드가 포함되어 있는지 확인하여 `menuSelect`의 값을 설정
		if (pageUrl.includes("dashboard")) {
			menuSelect.value = "dashboard";
		} else if (pageUrl.includes("member")) {
			menuSelect.value = "member";
		} else if (pageUrl.includes("question")) {
			menuSelect.value = "question";
		} else if (pageUrl.includes("medicinal")) {
			menuSelect.value = "medicinal";
		} else if (pageUrl.includes("prescription")) {
			menuSelect.value = "prescription";
		} else if (pageUrl.includes("constitution")) {
			menuSelect.value = "constitution";
		} else if (pageUrl.includes("protocol")) {
			menuSelect.value = "protocol";
		} else if (pageUrl.includes("individual")) {
			menuSelect.value = "individual";
		} else if (pageUrl.includes("stats")) {
			menuSelect.value = "stats";
		} else if (pageUrl.includes("today")) {
			menuSelect.value = "today";
		} else if (pageUrl.includes("treatment")) {
			menuSelect.value = "treatment";
		} else if (pageUrl.includes("medicine")) {
			menuSelect.value = "medicine";
		} else if (pageUrl.includes("patients")) {
			menuSelect.value = "patients";
		} else if (pageUrl.includes("settings")) {
			menuSelect.value = "settings";
		} else {
			// 해당하는 키워드가 없으면 '기타'를 기본값으로 설정
			menuSelect.value = "etc";
		}
	}

	if (resizeWidth !== "full") {
		capturedImage = await resizeImage(capturedImage, parseInt(resizeWidth, 10));
	}

	// --- 2. Fabric.js 캔버스 및 마커 기능 초기화 ---
	const canvas = new fabric.Canvas("canvas");
	let currentMode = "";
	let numberCounter = 1;
	let isDrawingRect = false;
	let rect, origX, origY;
	let canvasHistory = [];
	let isUndoRedo = false;

	// DOM 요소 가져오기
	const strokeWidthInput = document.getElementById("strokeWidth");
	const rectBorderColorPicker = document.getElementById("rectBorderColor");
	const rectFillColorPicker = document.getElementById("rectFillColor");

	fabric.Image.fromURL(capturedImage, (img) => {
		canvas.setWidth(img.width);
		canvas.setHeight(img.height);
		canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		saveState(); // 초기 상태 저장
	});

	function saveState() {
		if (!isUndoRedo) canvasHistory.push(JSON.stringify(canvas));
	}

	// --- 3. 마커 기능 관련 함수들 ---
	function setMode(mode) {
		currentMode = mode;
		if (mode === "draw") {
			canvas.isDrawingMode = true;
			canvas.freeDrawingBrush.width = parseInt(strokeWidthInput.value, 10);
			canvas.freeDrawingBrush.color = rectBorderColorPicker.value;
		} else {
			canvas.isDrawingMode = false;
		}
		canvas.selection = mode === "select";
		canvas.forEachObject((obj) => (obj.selectable = mode === "select"));
		canvas.discardActiveObject().renderAll();
	}

	function hexToRgba(hex, opacity) {
		const r = parseInt(hex.slice(1, 3), 16),
			g = parseInt(hex.slice(3, 5), 16),
			b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	// --- 4. 이벤트 핸들러 설정 ---
	// 툴바 버튼 이벤트
	document
		.getElementById("selectMode")
		.addEventListener("click", () => setMode("select"));
	document
		.getElementById("drawMode")
		.addEventListener("click", () => setMode("draw"));
	document
		.getElementById("rectMode")
		.addEventListener("click", () => setMode("rect"));
	document
		.getElementById("numberMode")
		.addEventListener("click", () => setMode("number"));

	// 색상 및 선 굵기 변경 이벤트
	strokeWidthInput.addEventListener("input", (e) => {
		const newWidth = parseInt(e.target.value, 10);
		canvas.freeDrawingBrush.width = newWidth;
		const activeObject = canvas.getActiveObject();
		if (activeObject) {
			activeObject.set("strokeWidth", newWidth);
			canvas.renderAll();
			saveState();
		}
	});
	rectBorderColorPicker.addEventListener("input", (e) => {
		canvas.freeDrawingBrush.color = e.target.value;
	});

	// 캔버스 마우스 이벤트 (사각형, 숫자 그리기)
	canvas.on("mouse:down", (o) => {
		if (currentMode === "rect") {
			isDrawingRect = true;
			const pointer = canvas.getPointer(o.e);
			origX = pointer.x;
			origY = pointer.y;
			rect = new fabric.Rect({
				left: origX,
				top: origY,
				width: 0,
				height: 0,
				stroke: rectBorderColorPicker.value,
				strokeWidth: parseInt(strokeWidthInput.value, 10),
				fill: hexToRgba(rectFillColorPicker.value, 0.3),
				selectable: false,
			});
			canvas.add(rect);
		} else if (currentMode === "number") {
			const pointer = canvas.getPointer(o.e);
			const circle = new fabric.Circle({
				radius: 15,
				fill: "red",
				originX: "center",
				originY: "center",
			});
			const numberText = new fabric.IText(String(numberCounter), {
				fontSize: 24,
				fill: "white",
				originX: "center",
				originY: "center",
			});
			const group = new fabric.Group([circle, numberText], {
				left: pointer.x,
				top: pointer.y,
			});
			canvas.add(group);
			numberCounter++;
		}
	});
	canvas.on("mouse:move", (o) => {
		if (!isDrawingRect) return;
		const pointer = canvas.getPointer(o.e);
		if (origX > pointer.x) rect.set({ left: Math.abs(pointer.x) });
		if (origY > pointer.y) rect.set({ top: Math.abs(pointer.y) });
		rect.set({
			width: Math.abs(origX - pointer.x),
			height: Math.abs(origY - pointer.y),
		});
		canvas.renderAll();
	});
	canvas.on("mouse:up", () => {
		if (isDrawingRect) {
			isDrawingRect = false;
			rect.set({ selectable: true });
			rect.setCoords();
			saveState();
		}
	});

	// 되돌리기(Undo) 이벤트
	window.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "z") {
			e.preventDefault();
			if (canvasHistory.length > 1) {
				isUndoRedo = true;
				canvasHistory.pop();
				canvas.loadFromJSON(
					JSON.parse(canvasHistory[canvasHistory.length - 1]),
					() => {
						canvas.renderAll();
						isUndoRedo = false;
					}
				);
			}
		}
	});
	canvas.on("object:added", saveState);
	canvas.on("object:modified", saveState);

	// 저장 및 목록 보기 버튼 이벤트
	document.getElementById("saveBtn").addEventListener("click", async () => {
		const profile = await storage.getSync(["userName", "userEmail"]);
		const reportData = {
			uniqueId,
			createdAt: new Date(),
			url: pageUrl,
			channel: document.getElementById("channel").value,
			menu: document.getElementById("menu").value,
			category: document.getElementById("reportCategory").value,
			title: document.getElementById("reportTitle").value,
			problem: document.getElementById("problemDesc").value,
			expected: document.getElementById("expectedResult").value,
			imageData: canvas.toDataURL({ format: "png" }), // 마크업이 포함된 이미지 저장
			reporterName: profile.userName || "N/A",
			reporterEmail: profile.userEmail || "N/A",
		};
		try {
			await saveReport(reportData);
			alert("리포트가 성공적으로 저장되었습니다!");

			// list.html의 전체 URL을 가져옵니다.
			const listUrl = chrome.runtime.getURL("list.html");
			// 1. 모든 탭을 가져와서 listUrl과 정확히 일치하는 탭이 있는지 확인합니다.
			const tabs = await chrome.tabs.query({});
			const listTab = tabs.find((tab) => tab.url === listUrl);
			if (listTab) {
				// 2-1. 탭이 이미 열려 있다면, 해당 탭을 활성화하고 새로고침합니다.
				await chrome.tabs.update(listTab.id, { active: true });
				await chrome.tabs.reload(listTab.id);
			} else {
				// 2-2. 탭이 열려 있지 않다면, 새로 엽니다.
				await chrome.tabs.create({ url: listUrl });
			}
			window.close();
		} catch (error) {
			alert("저장 중 오류가 발생했습니다.");
			console.error("Save error:", error);
		}
	});
	document.getElementById("listBtn").addEventListener("click", () => {
		chrome.tabs.create({ url: "list.html" });
	});

	// --- 5. 초기 설정 및 정리 ---
	setMode("rect"); // 기본 툴을 사각형으로 설정
	await storage.removeLocal("captureData");
});
