// ------------------- 1. IndexedDB 설정 및 함수 -------------------
const DB_NAME = "BugReportDB";
const STORE_NAME = "reports";
let db;

function openDb() {
	const request = indexedDB.open(DB_NAME, 1);
	request.onerror = (event) =>
		console.error("Database error:", event.target.errorCode);
	request.onsuccess = (event) => (db = event.target.result);
	request.onupgradeneeded = (event) => {
		const db = event.target.result;
		db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
	};
}
openDb(); // 페이지 로드 시 DB 열기

function saveReport(reportData) {
	if (!db) {
		alert("Database is not ready.");
		return;
	}
	const transaction = db.transaction([STORE_NAME], "readwrite");
	const store = transaction.objectStore(STORE_NAME);
	const request = store.add(reportData);
	request.onsuccess = () => {
		alert("리포트가 성공적으로 저장되었습니다!");
		// 여기에 저장 후 폼 초기화 또는 페이지 닫기 로직 추가 가능
	};
	request.onerror = (event) => {
		alert("저장 중 오류가 발생했습니다.");
		console.error("Save error:", event.target.error);
	};
}

// ------------------- 2. 에디터 로직 (기존 코드와 결합) -------------------
chrome.storage.local.get(["captureData"], (result) => {
	if (result.captureData) {
		const { capturedImage, pageUrl, captureTime } = result.captureData;

		// --- 폼 필드 자동 채우기 ---
		document.getElementById("pageUrl").value = pageUrl;
		document.getElementById("captureTime").value = new Date(
			captureTime
		).toLocaleString();

		const canvas = new fabric.Canvas("canvas");
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

		function hexToRgba(hex, opacity) {
			const r = parseInt(hex.slice(1, 3), 16),
				g = parseInt(hex.slice(3, 5), 16),
				b = parseInt(hex.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, ${opacity})`;
		}

		function saveState() {
			if (!isUndoRedo) canvasHistory.push(JSON.stringify(canvas));
		}

		function undo() {
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

		window.addEventListener("keydown", (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "z") {
				e.preventDefault();
				undo();
			}
		});

		canvas.on("object:added", saveState);
		canvas.on("object:modified", saveState);

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

		// --- 저장 버튼 이벤트 리스너 ---

		document.getElementById("saveBtn").addEventListener("click", () => {
			// 1. 설정에 저장된 프로필 정보를 먼저 가져온다.
			chrome.storage.sync.get(["userName", "userEmail"], (profile) => {
				// 2. 폼 데이터와 프로필 정보를 합쳐서 reportData 객체를 만든다.
				const reportData = {
					createdAt: new Date(),
					url: document.getElementById("pageUrl").value,
					title: document.getElementById("reportTitle").value,
					category: document.getElementById("reportCategory").value,
					problem: document.getElementById("problemDesc").value,
					expected: document.getElementById("expectedResult").value,
					imageData: canvas.toDataURL({ format: "png" }),
					// --- 프로필 정보 추가 ---
					reporterName: profile.userName || "N/A",
					reporterEmail: profile.userEmail || "N/A",
				};
				// 3. 완성된 데이터를 IndexedDB에 저장한다.
				saveReport(reportData);
			});
		});

		setMode("rect");
		chrome.storage.local.remove("captureData");
	}
});
