// editor.js (수정된 최종본)

// --- 1. IndexedDB 설정 및 함수 ---
const DB_NAME = "BugReportDB";
const STORE_NAME = "reports";
let db;

function openDb() {
	const e = indexedDB.open(DB_NAME, 2);
	(e.onerror = (e) => console.error("Database error:", e.target.errorCode)),
		(e.onsuccess = (e) => (db = e.target.result)),
		(e.onupgradeneeded = (e) => {
			const t = e.target.result;
			t.objectStoreNames.contains(STORE_NAME) &&
				t.deleteObjectStore(STORE_NAME),
				t.createObjectStore(STORE_NAME, { keyPath: "uniqueId" });
		});
}
openDb();
function saveReport(e) {
	if (!db) return void alert("Database is not ready.");
	const t = db
		.transaction([STORE_NAME], "readwrite")
		.objectStore(STORE_NAME)
		.put(e);
	(t.onsuccess = () => {
		alert("리포트가 성공적으로 저장되었습니다!");
	}),
		(t.onerror = (e) => {
			alert("저장 중 오류가 발생했습니다."),
				console.error("Save error:", e.target.error);
		});
}

// --- 이미지 리사이즈 함수 ---
function resizeImage(dataUrl, maxWidth) {
	return new Promise((resolve) => {
		const img = new Image();
		(img.onload = () => {
			if (img.width <= maxWidth) return void resolve(dataUrl);
			const t = document.createElement("canvas"),
				e = t.getContext("2d"),
				o = maxWidth / img.width;
			(t.width = maxWidth),
				(t.height = img.height * o),
				e.drawImage(img, 0, 0, t.width, t.height),
				resolve(t.toDataURL("image/png"));
		}),
			(img.src = dataUrl);
	});
}

// --- 2. 에디터 로직 ---
chrome.storage.local.get(["captureData"], async (result) => {
	if (result.captureData) {
		// ★★★ 1. 고유 ID를 기억할 변수 선언 ★★★
		let reportUniqueId = null;

		let { capturedImage, pageUrl, captureTime, resizeWidth, uniqueId } =
			result.captureData;

		// ★★★ 2. 변수에 고유 ID를 저장 (기억하기) ★★★
		reportUniqueId = uniqueId;

		if (resizeWidth !== "full") {
			capturedImage = await resizeImage(
				capturedImage,
				parseInt(resizeWidth, 10)
			);
		}

		// --- 폼 필드 자동 채우기 ---
		document.getElementById("pageUrl").value = pageUrl;
		document.getElementById("captureTime").value = new Date(
			captureTime
		).toLocaleString();

		const canvas = new fabric.Canvas("canvas");

		// --- 3. 저장 버튼 리스너 ---
		document.getElementById("saveBtn").addEventListener("click", () => {
			// 이제 storage에서 다시 읽어올 필요 없이, 기억해 둔 변수를 바로 사용
			if (!reportUniqueId) {
				alert("고유 ID를 찾을 수 없어 저장할 수 없습니다.");
				return;
			}

			const reportData = {
				uniqueId: reportUniqueId, // 기억해 둔 ID 사용
				createdAt: new Date(),
				url: document.getElementById("pageUrl").value,
				title: document.getElementById("reportTitle").value,
				category: document.getElementById("reportCategory").value,
				problem: document.getElementById("problemDesc").value,
				expected: document.getElementById("expectedResult").value,
				imageData: canvas.toDataURL({ format: "png" }),
			};

			chrome.storage.sync.get(["userName", "userEmail"], (profile) => {
				reportData.reporterName = profile.userName || "N/A";
				reportData.reporterEmail = profile.userEmail || "N/A";
				saveReport(reportData);
			});
		});

		let currentMode = "";
		let numberCounter = 1;
		let canvasHistory = [];
		let isUndoRedo = false;
		let isDrawingRect = false;
		let rect, origX, origY;
		const strokeWidthInput = document.getElementById("strokeWidth");
		const rectBorderColorPicker = document.getElementById("rectBorderColor");
		const rectFillColorPicker = document.getElementById("rectFillColor");

		fabric.Image.fromURL(capturedImage, (img) => {
			canvas.setWidth(img.width);
			canvas.setHeight(img.height);
			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
			saveState();
		});

		function hexToRgba(e, t) {
			const o = parseInt(e.slice(1, 3), 16),
				n = parseInt(e.slice(3, 5), 16),
				c = parseInt(e.slice(5, 7), 16);
			return `rgba(${o}, ${n}, ${c}, ${t})`;
		}
		function saveState() {
			isUndoRedo || canvasHistory.push(JSON.stringify(canvas));
		}
		function undo() {
			if (canvasHistory.length > 1) {
				(isUndoRedo = !0), canvasHistory.pop();
				const e = JSON.parse(canvasHistory[canvasHistory.length - 1]);
				canvas.loadFromJSON(e, () => {
					canvas.renderAll(), (isUndoRedo = !1);
				});
			}
		}
		function setMode(e) {
			(currentMode = e),
				"draw" === e
					? ((canvas.isDrawingMode = !0),
					  (canvas.freeDrawingBrush.width = parseInt(
							strokeWidthInput.value,
							10
					  )),
					  (canvas.freeDrawingBrush.color = rectBorderColorPicker.value))
					: (canvas.isDrawingMode = !1),
				(canvas.selection = "select" === e),
				canvas.forEachObject((t) => (t.selectable = "select" === e)),
				canvas.discardActiveObject().renderAll();
		}

		window.addEventListener("keydown", (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "z") {
				e.preventDefault();
				undo();
			}
		});
		canvas.on("object:added", saveState);
		canvas.on("object:modified", saveState);
		canvas.on("mouse:down", (o) => {
			if (currentMode !== "rect") return;
			isDrawingRect = true;
			const pointer = canvas.getPointer(o.e);
			origX = pointer.x;
			origY = pointer.y;
			const strokeWidth = parseInt(strokeWidthInput.value, 10);
			rect = new fabric.Rect({
				left: origX,
				top: origY,
				width: 0,
				height: 0,
				stroke: rectBorderColorPicker.value,
				strokeWidth: strokeWidth,
				fill: hexToRgba(rectFillColorPicker.value, 0.3),
				selectable: false,
			});
			canvas.add(rect);
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
			if (!isDrawingRect) return;
			isDrawingRect = false;
			rect.set({ selectable: true });
			rect.setCoords();
			saveState();
		});
		canvas.on("mouse:down", (o) => {
			if (currentMode !== "number") return;
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
		});
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
		document.getElementById("listBtn").addEventListener("click", () => {
			chrome.tabs.create({ url: "list.html" });
		});

		setMode("rect"); // 기본 툴 설정

		// 모든 정보를 변수에 저장하고, 임시 데이터는 삭제
		chrome.storage.local.remove("captureData");
	}
});
