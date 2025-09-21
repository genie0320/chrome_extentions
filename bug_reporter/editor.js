import { saveReport } from "./js/db.js";
import { resizeImage, getInitials } from "./js/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
	// Chrome API 래퍼
	const storage = {
		getLocal: (keys) => chrome.storage.local.get(keys),
		removeLocal: (keys) => chrome.storage.local.remove(keys),
		getSync: (keys) => chrome.storage.sync.get(keys),
	};

	const result = await storage.getLocal(["captureData"]);
	if (!result.captureData) return;

	let { capturedImage, resizeWidth, uniqueId } = result.captureData;

	// Auto-classification logic
	const { pageUrl, captureTime } = result.captureData;
	document.querySelector(
		".issue_id"
	).textContent = `이슈고유번호 : ${uniqueId}`;
	document.getElementById("pageUrl").value = pageUrl;
	document.getElementById("captureTime").value = new Date(
		captureTime
	).toLocaleString();

	// Auto-select channel and menu based on URL
	const channelSelect = document.getElementById("channel");
	const menuSelect = document.getElementById("menu");

	if (pageUrl.startsWith("http://43.202.30.40:3001/"))
		channelSelect.value = "joonLab";
	else if (pageUrl.startsWith("http://43.202.30.40:3002/"))
		channelSelect.value = "joonChart";
	else if (pageUrl.startsWith("http://43.202.30.40:3003/"))
		channelSelect.value = "tiom";

	const menuKeywords = {
		dashboard: "대시보드",
		member: "회원관리",
		question: "문항관리",
		medicinal: "약재관리",
		prescription: "처방전관리",
		constitution: "체질관리",
		protocol: "프로토콜관리",
		individual: "개별증례",
		stats: "통계/로그",
		today: "투데이",
		treatment: "진료하기",
		medicine: "첩약관리",
		patients: "환자관리",
		settings: "설정",
	};
	let foundMenu = false;
	for (const key in menuKeywords) {
		if (pageUrl.includes(key)) {
			menuSelect.value = key;
			foundMenu = true;
			break;
		}
	}
	if (!foundMenu) menuSelect.value = "etc";

	if (resizeWidth !== "full") {
		capturedImage = await resizeImage(capturedImage, parseInt(resizeWidth, 10));
	}

	const canvas = new fabric.Canvas("canvas");
	fabric.Image.fromURL(capturedImage, (img) => {
		canvas.setWidth(img.width);
		canvas.setHeight(img.height);
		canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
	});

	// Save button logic
	document.getElementById("saveBtn").addEventListener("click", async () => {
		const profile = await storage.getSync(["userName", "userEmail"]);
		const reportData = {
			uniqueId,
			createdAt: new Date(),
			url: pageUrl,
			title: document.getElementById("reportTitle").value,
			channel: channelSelect.value,
			menu: menuSelect.value,
			category: document.getElementById("reportCategory").value,
			problem: document.getElementById("problemDesc").value,
			expected: document.getElementById("expectedResult").value,
			imageData: canvas.toDataURL({ format: "png" }),
			reporterName: profile.userName || "N/A",
			reporterEmail: profile.userEmail || "N/A",
		};
		try {
			await saveReport(reportData);
			alert("리포트가 성공적으로 저장되었습니다!");
			window.close(); // Close editor tab after saving
		} catch (error) {
			alert("저장 중 오류가 발생했습니다.");
			console.error("Save error:", error);
		}
	});

	document.getElementById("listBtn").addEventListener("click", () => {
		chrome.tabs.create({ url: "list.html" });
	});

	await storage.removeLocal("captureData");
	// Other editor functionalities (drawing tools, undo, etc.) can be added here.
	// Keeping it simple for the refactoring focus.
});
