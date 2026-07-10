# 내부품질기한 계산기 V2

## 실행
압축을 풀고 `index.html`을 더블클릭하면 계산기를 사용할 수 있습니다.

브라우저가 `file://` 환경에서 JSON fetch를 차단해도 `js/default-products.js`의 기본 DB를 자동으로 사용합니다.
GitHub Pages에 업로드하면 `data/products.json`을 직접 불러옵니다.

## 관리자
- 주소: `admin.html`
- 기본 아이디: `admin`
- 기본 비밀번호: `admin`

관리자 인증은 서버 인증이 아니라 실수 방지용 브라우저 잠금입니다.
공개 배포 시 비밀번호를 소스 코드에서 숨길 수 없습니다.

## DB 저장 방식
1. 최초 실행: `data/products.json` 또는 내장 기본 DB
2. 관리자 저장 후: 해당 브라우저의 `localStorage`
3. JSON 내보내기: 현재 DB 백업
4. JSON 가져오기: 백업 DB 복원
5. 기본 DB 초기화: localStorage 수정본 삭제

## 파일 구조
- `index.html`: 계산기
- `admin.html`: DB 관리자
- `css/`: 스타일
- `js/db.js`: DB 로드·저장·가져오기·내보내기
- `js/calculator.js`: 날짜 계산
- `js/app.js`: 계산기 화면
- `js/admin.js`: 관리자 화면
- `data/products.json`: 기본 품목 DB

## V2.1 수정
- `file://` 로 직접 열 때 ES Module이 차단되던 문제를 수정했습니다.
- 별도 로컬 서버 없이 index.html과 admin.html이 동작합니다.

## V2.3 수정
- 빠른 날짜 보기를 당일 포함 방식으로 수정했습니다.
- 요일별 색상을 빠른 날짜 카드와 계산 결과에 복원했습니다.

## V2.4 수정
- 빠른 날짜 보기 기준일을 달력에서 직접 선택할 수 있습니다.
- 선택한 기준일을 당일 포함 방식으로 계산합니다.
- 오늘로 초기화 버튼이 빠른 날짜 기준일과 계산 기준일을 함께 초기화합니다.

## GitHub 자동 수정 관리자
- 관리자 페이지에서 GitHub 저장소, 브랜치, DB 경로, Fine-grained token을 설정합니다.
- 품목 저장/삭제 시 `data/products.json`을 GitHub에 자동 커밋합니다.
- 토큰 권한은 해당 저장소의 `Contents: Read and write`만 부여하세요.
- 토큰은 현재 관리자 탭의 `sessionStorage`에만 저장되며 로그아웃 시 삭제됩니다.
