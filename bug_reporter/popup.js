document.getElementById("captureBtn").addEventListener("click", () => {
	const resizeCheckbox = document.getElementById("resizeCheckbox");

	// 현재 활성화된 탭의 정보를 가져오기 위해 chrome.tabs.query 사용
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const currentTab = tabs[0];

		chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
			const processAndSave = (imageDataUrl) => {
				// 이미지, URL, 시간을 하나의 객체로 묶어서 저장
				const captureData = {
					capturedImage: imageDataUrl,
					pageUrl: currentTab.url,
					captureTime: new Date().toISOString(),
				};

				chrome.storage.local.set({ captureData }, () => {
					chrome.tabs.create({ url: "editor.html" });
				});
			};

			if (resizeCheckbox.checked && dataUrl) {
				resizeImage(dataUrl, 1400, processAndSave);
			} else {
				processAndSave(dataUrl);
			}
		});
	});
});

function resizeImage(dataUrl, maxWidth, callback) {
	const img = new Image();
	img.onload = () => {
		if (img.width <= maxWidth) {
			callback(dataUrl);
			return;
		}
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const ratio = maxWidth / img.width;
		canvas.width = maxWidth;
		canvas.height = img.height * ratio;
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		callback(canvas.toDataURL("image/png"));
	};
	img.src = dataUrl;
}
