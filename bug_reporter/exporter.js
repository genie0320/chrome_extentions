// exporter.js (수정된 파일)

export async function exportToExcelZip(reports, JSZip, XLSX) {
	if (reports.length === 0) {
		alert("내보낼 리포트가 없습니다.");
		return;
	}

	try {
		const excelData = [];

		for (const report of reports) {
			excelData.push({
				번호: report.uniqueId,
				상태: report.status || "접수완료",
				분류: report.category,
				타이틀: report.title,
				"페이지 URL": report.url,
				"리포트 일시": new Date(report.createdAt).toLocaleString(),
				"문제점 기술": report.problem,
				"원하는 결과": report.expected,
				"이미지 경로": `images/report_${report.uniqueId}.png`,
				"담당자 이름": report.reporterName,
				"담당자 이메일": report.reporterEmail,
			});
		}

		// ★★★ 핵심 수정: 엑셀 변환 전 데이터가 유효한지 최종 확인 ★★★
		if (!Array.isArray(excelData) || excelData.length === 0) {
			throw new Error("엑셀로 변환할 유효한 데이터가 없습니다.");
		}

		const zip = new JSZip();
		const imgFolder = zip.folder("images");

		for (const report of reports) {
			const imageFileName = `report_${report.uniqueId}.png`;
			const base64Data = report.imageData.split(",")[1];
			if (base64Data) {
				imgFolder.file(imageFileName, base64Data, { base64: true });
			}
		}

		const worksheet = XLSX.utils.json_to_sheet(excelData);

		// 1. 시트의 데이터 범위를 가져옴
		const range = XLSX.utils.decode_range(worksheet["!ref"]);

		// 2. '이미지 경로'가 몇 번째 열인지 찾기
		let imagePathColIndex = -1;
		for (let C = range.s.c; C <= range.e.c; ++C) {
			const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
			if (cell && cell.v === "이미지 경로") {
				imagePathColIndex = C;
				break;
			}
		}

		// 3. 찾은 열의 모든 행을 순회하며 수식으로 변경
		if (imagePathColIndex > -1) {
			// 첫 번째 행(헤더)은 건너뛰고 데이터 행부터 시작 (r = 1)
			for (let R = range.s.r + 1; R <= range.e.r; ++R) {
				const cellAddress = XLSX.utils.encode_cell({
					r: R,
					c: imagePathColIndex,
				});
				const cell = worksheet[cellAddress];
				if (cell && cell.t === "s") {
					// 셀이 존재하고 타입이 문자열(string)이면
					const path = cell.v;
					// 셀 타입을 'f'(formula)로 바꾸고, HYPERLINK 수식을 값으로 넣음
					cell.t = "f";
					cell.f = `HYPERLINK("${path}", "${path}")`;
				}
			}
		}

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Bug Reports");
		const excelBuffer = XLSX.write(workbook, {
			bookType: "xlsx",
			type: "array",
		});
		zip.file("reports.xlsx", new Blob([excelBuffer]));

		const zipBlob = await zip.generateAsync({ type: "blob" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(zipBlob);
		link.download = `bug_reports_${new Date().toISOString().slice(0, 10)}.zip`;
		link.click();
		URL.revokeObjectURL(link.href);
	} catch (error) {
		console.error("엑셀 내보내기 중 오류 발생:", error);
		throw new Error("파일을 생성하는 중 오류가 발생했습니다.");
	}
}

// 이하 다른 함수들은 동일
export function exportToGoogleSheet(reports) {
	/* ... */
}
export function exportToNotion(reports) {
	/* ... */
}
