// 확장 프로그램 아이콘이 클릭되었을 때 이 코드가 실행됨
chrome.action.onClicked.addListener((tab) => {
	// 설정에서 리사이즈 옵션을 가져옴 (나중에 옵션 페이지 만들 때 연동)
	// 지금은 일단 true(리사이즈 함)로 고정
	const shouldResize = true;

	chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
		// dataUrl이 없을 경우(예: 빈 페이지) 오류 방지
		if (!dataUrl) {
			console.error("Failed to capture tab.");
			return;
		}

		const processAndSave = (imageDataUrl) => {
			const captureData = {
				capturedImage: imageDataUrl,
				pageUrl: tab.url,
				captureTime: new Date().toISOString(),
			};

			chrome.storage.local.set({ captureData }, () => {
				chrome.tabs.create({ url: "editor.html" });
			});
		};

		if (shouldResize) {
			// 이미지 리사이즈 로직. OffscreenCanvas를 사용해 백그라운드에서 처리
			createImageBitmap(dataUrlToBlob(dataUrl)).then((imageBitmap) => {
				const maxWidth = 1400;
				if (imageBitmap.width <= maxWidth) {
					processAndSave(dataUrl);
					return;
				}

				const ratio = maxWidth / imageBitmap.width;
				const canvas = new OffscreenCanvas(
					maxWidth,
					imageBitmap.height * ratio
				);
				const ctx = canvas.getContext("2d");
				ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

				canvas.convertToBlob({ type: "image/png" }).then((blob) => {
					const reader = new FileReader();
					reader.onload = () => processAndSave(reader.result);
					reader.readAsDataURL(blob);
				});
			});
		} else {
			processAndSave(dataUrl);
		}
	});
});

// Data URL을 Blob 객체로 변환하는 헬퍼 함수
function dataUrlToBlob(dataUrl) {
	const parts = dataUrl.split(",");
	const mimeType = parts[0].match(/:(.*?);/)[1];
	const b64 = atob(parts[1]);
	let n = b64.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = b64.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mimeType });
}
