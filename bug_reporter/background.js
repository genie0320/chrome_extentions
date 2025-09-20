// 확장 프로그램 아이콘 클릭 시 실행
chrome.action.onClicked.addListener(async (tab) => {
	// 1. 설정에서 사용자 정보와 카운터, 리사이즈 설정을 가져옴
	const settings = await chrome.storage.sync.get([
		"userName",
		"issueCounter",
		"captureWidth",
	]);
	const userName = settings.userName || "USER";
	const currentCounter = settings.issueCounter || 0;
	const newCounter = currentCounter + 1;
	const captureWidthSetting = settings.captureWidth || "1200";

	// 2. 새로운 고유 ID 생성
	const initials = getInitials(userName);
	const uniqueId = `${initials}-${newCounter}`;

	// 3. 증가된 카운터를 바로 저장
	await chrome.storage.sync.set({ issueCounter: newCounter });

	// 4. 원본 크기로 캡처 실행
	const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
	if (!dataUrl) {
		console.error("Failed to capture tab.");
		return;
	}

	// 5. 캡처 데이터와 함께 '리사이즈 지시사항'을 에디터로 전달
	const captureData = {
		uniqueId: uniqueId,
		capturedImage: dataUrl, // 원본 이미지 전달
		pageUrl: tab.url,
		captureTime: new Date().toISOString(),
		resizeWidth: captureWidthSetting, // 'full' 또는 '800', '1200'
	};

	await chrome.storage.local.set({ captureData });
	await chrome.tabs.create({ url: "editor.html" });
});

// 이름으로부터 이니셜을 생성하는 헬퍼 함수
function getInitials(name) {
	// option page에 이니셜을 입력받는 사용자입력란 추가. (이니셜은 5자 이내의 알파벳)
	let result = "";
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i) - 44032;
		if (code > -1 && code < 11172) result += cho[Math.floor(code / 588)];
		else if (/[A-Z]/.test(name[i])) result += name[i];
	}
	return result.toUpperCase() || "USER";
}
