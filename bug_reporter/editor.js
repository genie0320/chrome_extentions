chrome.storage.local.get(["capturedImage"], (result) => {
	if (result.capturedImage) {
		const canvas = new fabric.Canvas("canvas");
		let currentMode = "";
		let numberCounter = 1;
		let canvasHistory = [];
		let isUndoRedo = false;
		let isDrawingRect = false;
		let rect, origX, origY;

		// --- UI 요소 가져오기 ---
		const strokeWidthInput = document.getElementById("strokeWidth");
		const rectBorderColorPicker = document.getElementById("rectBorderColor");
		const rectFillColorPicker = document.getElementById("rectFillColor");

		fabric.Image.fromURL(result.capturedImage, (img) => {
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
			// '자유롭게 그리기' 모드일 때 선 굵기 적용
			if (mode === "draw") {
				canvas.isDrawingMode = true;
				canvas.freeDrawingBrush.width = parseInt(strokeWidthInput.value, 10);
				canvas.freeDrawingBrush.color = rectBorderColorPicker.value; // 테두리 색상과 동일하게 설정
			} else {
				canvas.isDrawingMode = false;
			}
			canvas.selection = mode === "select";
			canvas.forEachObject((obj) => (obj.selectable = mode === "select"));
			canvas.discardActiveObject().renderAll();
		}

		// --- 사각형 그리기 로직 (선 굵기 적용) ---
		canvas.on("mouse:down", (o) => {
			if (currentMode !== "rect") return;
			isDrawingRect = true;
			const pointer = canvas.getPointer(o.e);
			origX = pointer.x;
			origY = pointer.y;
			const borderColor = rectBorderColorPicker.value;
			const fillColor = hexToRgba(rectFillColorPicker.value, 0.3);
			const strokeWidth = parseInt(strokeWidthInput.value, 10); // 선 굵기 값 가져오기

			rect = new fabric.Rect({
				left: origX,
				top: origY,
				width: 0,
				height: 0,
				stroke: borderColor,
				strokeWidth: strokeWidth, // 선 굵기 적용
				fill: fillColor,
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

		// --- 숫자 스탬프 로직 ---
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

		// --- 선 굵기 실시간 변경 이벤트 리스너 ---
		strokeWidthInput.addEventListener("input", (e) => {
			const newWidth = parseInt(e.target.value, 10);
			canvas.freeDrawingBrush.width = newWidth; // 자유 그리기 굵기 변경
			const activeObject = canvas.getActiveObject();
			if (activeObject) {
				// 선택된 객체 굵기 변경
				activeObject.set("strokeWidth", newWidth);
				canvas.renderAll();
				saveState();
			}
		});

		// --- 테두리 색상 변경 시 자유 그리기 붓 색상도 변경 ---
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

		setMode("select");
		chrome.storage.local.remove("capturedImage");
	}
});
