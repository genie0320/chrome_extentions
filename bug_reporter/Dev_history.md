## 2025-09-21

-
- 1차 리팩토링

```
bug-reporter/
├── css/
│   ├── common.css       (공통 스타일)
│   ├── editor.css       (에디터 페이지 스타일)
│   └── list.css         (목록 페이지 스타일)
├── images/
│   └── (아이콘 파일들)
├── js/
│   ├── constants.js     (상수 모음)
│   ├── db.js            (데이터베이스 전문가)
│   ├── utils.js         (다용도 도구함)
│   └── chrome-api.js    (크롬 API 담당자)
├── libs/
│   ├── fabric.min.js
│   ├── jszip.min.js
│   └── xlsx.full.min.js
├── background.js        (리팩토링됨)
├── editor.html          (정리됨)
├── editor.js            (리팩토링됨)
├── exporter.js          (유지)
├── list.html            (정리됨)
├── list.js              (리팩토링됨)
├── manifest.json        (유지)
├── options.html         (정리됨)
├── options.js           (리팩토링됨)
└── popup.html           (유지)
```
