## 2025-09-21

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

### Thins I learned.

1. 크롬 확장 프로그램의 Manifest V3에서는 service_worker로 설정된 background.js 파일이 일반 스크립트로 동작하므로, ES 모듈 문법(import, export)을 직접 사용하면 에러가 난다. service_worker는 ES 모듈을 직접 지원하지 않기때문.

결과적으로 background.js 파일의 첫 줄에 import { getInitials } from "./js/utils.js"; 코드떄문에 다음 에러가 발생.

- Uncaught SyntaxError : '야. 모듈문법 그대로 쓰면 안된다'
- Service worker registration failed : '그래서 서비스워커 등록도 안시켜줄거야'

```json
// Manifest V3에서는 import 한 js가 모듈로 동작하도록 하면 된다.
// background.js 에서 import를 한다면 다음과 같이 manidest.json에 다음을 추가한다.
"background": {
    "service_worker": "background.js",
    "type": "module"  // 여기
},
```

```html
<!-- 하지만 다른 js 들은, html에서 호출할 때 저걸 붙여준다. -->
<script src="editor.js" type="module"></script>
```
