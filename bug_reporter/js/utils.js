// 이름으로부터 이니셜을 생성하는 함수
// TODO : 이니셜을 새로 받는 UI 'options.html'에 만들고 그걸로 기능교체.
export function getInitials(name) {
	const cho = [
		"ㄱ",
		"ㄲ",
		"ㄴ",
		"ㄷ",
		"ㄸ",
		"ㄹ",
		"ㅁ",
		"ㅂ",
		"ㅃ",
		"ㅅ",
		"ㅆ",
		"ㅇ",
		"ㅈ",
		"ㅉ",
		"ㅊ",
		"ㅋ",
		"ㅌ",
		"ㅍ",
		"ㅎ",
	];
	let result = "";
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i) - 44032;
		if (code > -1 && code < 11172) result += cho[Math.floor(code / 588)];
		else if (/[A-Z]/.test(name[i])) result += name[i];
	}
	return result.toUpperCase() || "USER";
}

// 이미지 리사이즈 함수 (Promise 기반)
export function resizeImage(dataUrl, maxWidth) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			if (img.width <= maxWidth) return resolve(dataUrl);
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			const ratio = maxWidth / img.width;
			canvas.width = maxWidth;
			canvas.height = img.height * ratio;
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			resolve(canvas.toDataURL("image/png"));
		};
		img.src = dataUrl;
	});
}
