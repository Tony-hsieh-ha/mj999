# GitHub Pages 部署指南

## 🚀 快速部署到 GitHub Pages

### 步驟1：創建 GitHub 倉庫
1. 登录 [GitHub](https://github.com)
2. 點擊 "New repository"
3. 倉庫名稱：`smart-matching-system`
4. 設為 Public
5. 勾選 "Add a README file"

### 步驟2：上傳檔案
將以下檔案上傳到倉庫：
- `index.html`
- `invite-system.html` 
- `line-login.html`
- `script.js`
- `invite-system.js`
- `style.css`
- `README.md`
- `使用說明.md`

### 步驟3：啟用 GitHub Pages
1. 進入倉庫 Settings
2. 左側選單點擊 "Pages"
3. Source 選擇 "Deploy from a branch"
4. Branch 選擇 "main"
5. 資料夾選擇 "/ (root)"
6. 點擊 "Save"

### 步驟4：獲取網址
部署完成後，您的網站將在：
`https://[您的用戶名].github.io/smart-matching-system`

### 步驟5：LINE Login 設定
1. 申請 [LINE Login](https://developers.line.biz/console/)
2. 創建新的 Login Channel
3. 設定 Callback URL：`https://[您的網址]/line-login.html`
4. 將 Channel ID 替換到 `line-login.html` 中

## 📱 手機測試
部署完成後，直接用手機瀏覽器訪問您的 GitHub Pages 網址即可測試！

## 🔧 修改 LINE Login 設定
在 `line-login.html` 中找到這行：
```javascript
const LINE_LOGIN_CONFIG = {
    channelId: 'YOUR_CHANNEL_ID', // 替換為實際的 Channel ID
```
將 `YOUR_CHANNEL_ID` 替換為您申請的實際 Channel ID。
