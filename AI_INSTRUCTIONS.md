# MJ999 AI 指令對接點

## 📋 專案概述

MJ999 是一個智能麻將配對系統，採用前後台分離架構，支援 LINE Notify 自動通知、即時配對、管理後台等功能。

## 🏗️ 系統架構

### 前台 (index.html)
- **用途**: 純顯示模式，適合店面大螢幕展示
- **功能**: 查看配對狀態、統計資訊、即時時鐘
- **特色**: 3缺1紅色閃爍效果、大字體顯示、狀態顏色管理

### 後台 (admin.html)
- **用途**: 管理員專用操作介面
- **功能**: 報名管理、配對操作、系統設定
- **特色**: 身分驗證、活動日誌、LINE Notify 控制

### API 層 (api.js)
- **用途**: 安全保護機制和 LINE Notify 服務
- **功能**: 權限驗證、通知發送、Token 管理

## 🔧 核心功能

### 1. LINE Notify 自動揪團
- **觸發條件**: 當某金額組有 3 人報名時
- **通知格式**: `【MJ999 揱團】目前有一桌 3 缺 1！想打的快來報名！地點：[預設店名]`
- **防洗版**: 同一金額 10 分鐘內不重複發送
- **控制開關**: 管理員可開關自動通知功能

### 2. 3 缺 1 紅色閃爍效果
- **顯示位置**: 前台頁面中央彈出提示
- **動畫效果**: 紅色呼吸燈 + 旋轉光圈 + 彈跳圖標
- **自動隱藏**: 5 秒後自動消失
- **觸發條件**: 檢測到有金額組為 3 人時

### 3. 大螢幕視覺優化
- **字體大小**: 金額 $30/10 使用 2rem 字體
- **顏色系統**: 
  - 🟢 遊戲中: 深綠色 `#28a745`
  - 🟡 等待中: 黃色 `#ffc107`
  - ⚫ 缺人中: 深灰色 `#6c757d`
  - 🔴 3缺1: 紅色呼吸燈 `#ff4444`
- **即時時鐘**: 右下角固定顯示，金色發光效果

### 4. 管理後台功能
- **一鍵清空/結算**: 重設所有遊戲中桌子為空桌狀態
- **LINE 自動通知開關**: 靈活控制自動通知功能
- **活動日誌**: 記錄所有管理操作
- **設定持久化**: 所有設定自動儲存

## 📁 檔案結構

```
MJ999/
├── index.html              # 前台頁面 (ReadOnly)
├── admin.html              # 管理後台頁面
├── frontend.js             # 前台邏輯
├── admin.js               # 管理後台邏輯
├── api.js                 # API 安全保護 + LINE Notify
├── mock-api.js            # Mock API (數據模擬)
├── style.css              # 樣式檔案
├── line-login.html         # LINE 登入頁面
├── vercel.json            # Vercel 配置檔案
├── DEPLOYMENT.md          # 部署說明
└── AI_INSTRUCTIONS.md     # 本文件
```

## 🔐 環境變數

### Vercel 環境變數
| 變數名稱 | 值 | 說明 |
|----------|----|-----|
| `ADMIN_PASSWORD` | `你的管理員密碼` | 管理後台登入密碼 |
| `LINE_NOTIFY_TOKEN` | `你的LINE Notify Token` | LINE通知服務權限金鑰 |
| `DEFAULT_LOCATION` | `你的預設店名` | 通知訊息中的地點名稱 |

### 本地開發環境變數
```env
ADMIN_PASSWORD=your_local_admin_password
LINE_NOTIFY_TOKEN=your_local_line_notify_token
DEFAULT_LOCATION=你的店名
```

## 🎯 AI 開發指令

### 常見修改任務

#### 1. 新增通知類型
```javascript
// 在 LineNotifyService 中新增方法
async sendCustomNotification(type, data) {
    const message = `【MJ999 ${type}】${this.formatMessage(data)}`;
    return await this.sendNotification(message);
}
```

#### 2. 修改視覺效果
```css
/* 在 style.css 中修改動畫 */
.near-complete-alert {
    animation: customAnimation 2s infinite;
}

@keyframes customAnimation {
    /* 自定義動畫 */
}
```

#### 3. 新增管理功能
```javascript
// 在 admin.js 中新增方法
newManagementFunction() {
    // 新功能邏輯
    this.logActivity('新功能執行', 'info');
}
```

#### 4. 更新前台顯示
```javascript
// 在 frontend.js 中修改顯示邏輯
updateDisplay() {
    // 更新顯示邏輯
    this.checkNearCompleteAlert();
}
```

## 🔧 開發規範

### 程式碼風格
- 使用 ES6+ 語法
- 採用 Class 基礎架構
- 完整的錯誤處理
- 詳細的註解說明

### 檔案修改原則
- **優先修改現有檔案**，避免重複建立
- **保持向後相容性**，不破壞現有功能
- **遵循現有命名規則**，保持一致性
- **添加適當的日誌記錄**，方便除錯

### 安全考量
- 所有寫入操作需要權限驗證
- 敏感資料使用環境變數
- 前後台職責分離
- 防洗版機制保護

## 🚀 部署流程

### 1. 開發階段
```bash
# 本地測試
python -m http.server 8000
# 或
npx serve .
```

### 2. 提交程式碼
```bash
git add .
git commit -m "功能描述"
git push origin main
```

### 3. Vercel 部署
- 設定環境變數
- 自動部署
- 功能測試

## 📞 故障排除

### 常見問題
1. **LINE Notify 無法發送**
   - 檢查 Token 是否正確
   - 確認網路連線
   - 查看 Console 錯誤訊息

2. **3缺1 效果不顯示**
   - 檢查 CSS 動畫是否載入
   - 確認 JavaScript 邏輯是否正確
   - 驗證 DOM 元素是否存在

3. **管理後台無法登入**
   - 檢查 ADMIN_PASSWORD 環境變數
   - 確認 localStorage 狀態
   - 清除瀏覽器快取重試

### 除錯工具
- **瀏覽器開發者工具**: Console、Network、Elements
- **Vercel Function Logs**: API 執行日誌
- **localStorage 檢查**: 應用程式狀態

## 🔄 未來擴展

### 計劃功能
- **真實後端整合**: 替換 Mock API
- **WebSocket 即時通訊**: 即時更新狀態
- **多語言支援**: 國際化功能
- **行動應用**: PWA 支援
- **資料分析**: 配對統計分析

### 技術升級
- **TypeScript**: 類型安全
- **React/Vue**: 現代前端框架
- **Node.js**: 真實後端服務
- **Database**: 資料庫整合

---

## 📝 AI 指令總結

當收到開發需求時，請依照以下原則執行：

1. **優先修改現有檔案**，避免重複建立
2. **保持系統架構完整性**，不破壞前後台分離
3. **遵循現有程式碼風格**，保持一致性
4. **添加完整的錯誤處理**，提升穩定性
5. **更新相關文件**，保持同步性
6. **測試功能完整性**，確保正常運作

這個系統設計為模組化、可擴展的架構，方便後續功能擴展和維護。🎯✨
