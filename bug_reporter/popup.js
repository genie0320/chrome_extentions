document.getElementById("captureBtn").addEventListener("click", () => {
	chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
		// 1. 캡처한 이미지(dataUrl)를 브라우저 임시 저장소에 'capturedImage'라는 이름으로 저장
		chrome.storage.local.set({ capturedImage: dataUrl }, () => {
			// 2. 저장이 완료되면, 'editor.html' 파일을 새 탭으로 열어줘
			chrome.tabs.create({ url: "editor.html" });
		});
	});
});
