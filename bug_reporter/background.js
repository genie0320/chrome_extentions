import { getInitials } from "./js/utils.js";

// Promise 기반 Chrome API 래퍼
const storage = {
	get: (keys) => chrome.storage.sync.get(keys),
	set: (items) => chrome.storage.sync.set(items),
	getLocal: (keys) => chrome.storage.local.get(keys),
	setLocal: (items) => chrome.storage.local.set(items),
};

async function captureAndPrepareData(tab) {
	try {
		const settings = await storage.get([
			"userName",
			"issueCounter",
			"captureWidth",
		]);
		const userName = settings.userName || "USER";
		const currentCounter = settings.issueCounter || 0;
		const newCounter = currentCounter + 1;

		const initials = getInitials(userName);
		const uniqueId = `${initials}-${newCounter}`;

		await storage.set({ issueCounter: newCounter });

		const dataUrl = await chrome.tabs.captureVisibleTab(null, {
			format: "png",
		});
		if (!dataUrl) throw new Error("Failed to capture tab.");

		const captureData = {
			uniqueId,
			capturedImage: dataUrl,
			pageUrl: tab.url,
			captureTime: new Date().toISOString(),
			resizeWidth: settings.captureWidth || "1200",
		};

		await storage.setLocal({ captureData });
		await chrome.tabs.create({ url: "editor.html" });
	} catch (error) {
		console.error("Capture process failed:", error);
	}
}

chrome.action.onClicked.addListener(captureAndPrepareData);
