document.getElementById("captureBtn").addEventListener("click", () => {
	const resizeCheckbox = document.getElementById("resizeCheckbox");

	chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
		// 체크박스가 선택되어 있으면 이미지 리사이즈 함수 호출
		if (resizeCheckbox.checked) {
			resizeImage(dataUrl, 1400, (resizedDataUrl) => {
				saveAndOpenEditor(resizedDataUrl);
			});
		} else {
			saveAndOpenEditor(dataUrl);
		}
	});
});

/**
 * 이미지 데이터(DataURL)를 주어진 최대 너비로 리사이즈하는 함수
 * @param {string} dataUrl 원본 이미지 데이터
 * @param {number} maxWidth 최대 너비
 * @param {function} callback 리사이즈 완료 후 실행될 콜백 함수
 */
function resizeImage(dataUrl, maxWidth, callback) {
	const img = new Image();
	img.onload = () => {
		// 이미지 너비가 최대 너비보다 작거나 같으면 리사이즈 불필요
		if (img.width <= maxWidth) {
			callback(dataUrl);
			return;
		}
		// 리사이즈를 위한 임시 캔버스 생성
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const ratio = maxWidth / img.width;
		canvas.width = maxWidth;
		canvas.height = img.height * ratio;

		// 캔버스에 리사이즈된 이미지 그리기
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		// 캔버스에서 새로운 이미지 데이터 추출하여 콜백 실행
		callback(canvas.toDataURL("image/png"));
	};
	img.src = dataUrl;
}

/**
 * 이미지 데이터를 저장하고 에디터 탭을 여는 함수
 * @param {string} imageDataUrl 저장할 이미지 데이터
 */
function saveAndOpenEditor(imageDataUrl) {
	chrome.storage.local.set({ capturedImage: imageDataUrl }, () => {
		chrome.tabs.create({ url: "editor.html" });
	});
}
