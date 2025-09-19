// 브라우저 임시 저장소에서 'capturedImage' 데이터를 가져옴
chrome.storage.local.get(["capturedImage"], (result) => {
	if (result.capturedImage) {
		// 1. fabric.js를 사용해 캔버스를 초기화
		const canvas = new fabric.Canvas("canvas");

		// 2. 캡처한 이미지를 캔버스의 배경으로 설정
		fabric.Image.fromURL(result.capturedImage, (img) => {
			// 캔버스 크기를 이미지 크기에 맞춤
			canvas.setWidth(img.width);
			canvas.setHeight(img.height);
			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
		});

		// 3. 캔버스를 '그리기 모드'로 설정
		canvas.isDrawingMode = true;
		canvas.freeDrawingBrush.width = 5;
		canvas.freeDrawingBrush.color = "red";

		// 사용이 끝난 이미지 데이터는 저장소에서 삭제
		chrome.storage.local.remove("capturedImage");
	}
});
