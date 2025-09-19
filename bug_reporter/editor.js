chrome.storage.local.get(["capturedImage"], (result) => {
	if (result.capturedImage) {
		// ------------------- 1. 캔버스 및 변수 초기 설정 -------------------
		const canvas = new fabric.Canvas("canvas");
		let currentMode = ""; // 현재 모드 (draw, rect, number 등)
		let numberCounter = 1; // 숫자 스탬프 카운터

		// 사각형 그리기를 위한 변수
		let isDrawingRect = false;
		let rect, origX, origY;

		// ------------------- 2. 이미지 배경으로 설정 -------------------
		fabric.Image.fromURL(result.capturedImage, (img) => {
			canvas.setWidth(img.width);
			canvas.setHeight(img.height);
			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		});

		// ------------------- 3. 모드 변경 함수 -------------------
		function setMode(mode) {
			currentMode = mode;
			// 자유 그리기 모드는 fabric.js 기본 기능 사용
			canvas.isDrawingMode = mode === "draw";

			// 다른 모드에서는 기본 객체 선택이 가능하도록 설정
			canvas.selection = mode === "select";
			canvas.forEachObject((obj) => (obj.selectable = mode === "select"));

			console.log("Current mode:", currentMode);
		}

		// ------------------- 4. 사각형 그리기 로직 -------------------
		canvas.on("mouse:down", (o) => {
			if (currentMode !== "rect") return;
			isDrawingRect = true;
			const pointer = canvas.getPointer(o.e);
			origX = pointer.x;
			origY = pointer.y;
			rect = new fabric.Rect({
				left: origX,
				top: origY,
				width: 0,
				height: 0,
				stroke: "red",
				strokeWidth: 3,
				fill: "transparent",
				selectable: false, // 그리는 동안은 선택 안되게
			});
			canvas.add(rect);
		});

		canvas.on("mouse:move", (o) => {
			if (!isDrawingRect) return;
			const pointer = canvas.getPointer(o.e);
			if (origX > pointer.x) {
				rect.set({ left: Math.abs(pointer.x) });
			}
			if (origY > pointer.y) {
				rect.set({ top: Math.abs(pointer.y) });
			}
			rect.set({ width: Math.abs(origX - pointer.x) });
			rect.set({ height: Math.abs(origY - pointer.y) });
			canvas.renderAll();
		});

		canvas.on("mouse:up", () => {
			if (!isDrawingRect) return;
			isDrawingRect = false;
			rect.setCoords(); // 좌표 재계산
		});

		// ------------------- 5. 숫자 스탬프 로직 -------------------
		canvas.on("mouse:down", (o) => {
			if (currentMode !== "number") return;
			const pointer = canvas.getPointer(o.e);
			const numberText = new fabric.IText(String(numberCounter), {
				left: pointer.x - 12, // 원 중앙에 오도록 위치 조정
				top: pointer.y - 12,
				fontSize: 24,
				fill: "white",
			});
			const circle = new fabric.Circle({
				left: pointer.x - 15, // 원이 텍스트를 감싸도록
				top: pointer.y - 15,
				radius: 15,
				fill: "red",
				stroke: "red",
			});
			const group = new fabric.Group([circle, numberText], {
				left: pointer.x,
				top: pointer.y,
			});
			canvas.add(group);
			numberCounter++;
		});

		// ------------------- 6. 버튼에 이벤트 리스너 연결 -------------------
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

		// 초기 모드 설정
		setMode("draw");

		chrome.storage.local.remove("capturedImage");
	}
});
