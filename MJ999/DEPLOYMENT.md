# MJ999 智能配對系統 - 部署說明

## 🏗️ 系統架構

系統已重構為**前後台分離**架構：

### 📱 前台 (index.html)
- **純顯示模式** - 僅供查看配對狀態
- **無法操作** - 所有增刪改查功能已移除
- **統計資訊** - 顯示配對統計和圖表
- **LINE 登入** - 用戶可查看個人狀態

### 🔐 管理後台 (admin.html)
- **完整管理功能** - 所有增刪改查操作
- **身分驗證** - 需要管理員密碼
- **活動日誌** - 記錄所有管理操作
- **系統設定** - LINE Notify、安全設定等

---

## 🔧 Vercel 環境變數配置

### 必要的環境變數

在 Vercel 專案設定中添加以下環境變數：

| 變數名稱 | 值 | 說明 |
|----------|----|-----|
| `ADMIN_PASSWORD` | `你的管理員密碼` | 管理後台登入密碼 |
| `LINE_NOTIFY_TOKEN` | `你的LINE Notify Token` | LINE通知服務權限金鑰 |

### 設定步驟

1. **進入 Vercel 專案設定**
   - 開啟 [Vercel Dashboard](https://vercel.com/dashboard)
   - 選擇你的 MJ999 專案

2. **添加環境變數**
   - 點擊 "Settings" → "Environment Variables"
   - 添加以下變數：

   ```
   ADMIN_PASSWORD=your_secure_admin_password
   LINE_NOTIFY_TOKEN=your_line_notify_token
   ```

3. **重新部署**
   - 設定完成後點擊 "Redeploy"
   - 等待部署完成

---

## 📁 檔案結構

```
MJ999/
├── index.html          # 前台頁面 (ReadOnly)
├── admin.html          # 管理後台頁面
├── frontend.js         # 前台邏輯
├── admin.js           # 管理後台邏輯
├── api.js             # API 安全保護機制
├── mock-api.js        # Mock API (數據模擬)
├── style.css          # 樣式檔案
├── line-login.html     # LINE 登入頁面
├── vercel.json        # Vercel 配置檔案
└── DEPLOYMENT.md      # 本文件
```

---

## 🔐 安全機制說明

### 1. 管理員身分驗證
- **密碼保護** - 使用環境變數中的 `ADMIN_PASSWORD`
- **會話管理** - localStorage 儲存登入狀態
- **自動過期** - 預設 60 分鐘會話超時

### 2. API 安全保護
- **權限檢查** - 所有寫入操作需要驗證
- **Token 驗證** - 支援 Bearer Token 和 Session Token
- **CORS 保護** - 正確的跨域請求設定

### 3. 前後台分離
- **職責分離** - 前台僅查看，後台管理
- **數據保護** - 敏感操作需權限驗證
- **操作追蹤** - 所有管理操作都有日誌

---

## 🚀 部署流程

### 1. 準備程式碼
```bash
git add .
git commit -m "重構為前後台分離架構"
git push origin main
```

### 2. Vercel 部署
```bash
# 如果已安裝 Vercel CLI
vercel --prod

# 或透過 GitHub 自動部署
```

### 3. 設定環境變數
在 Vercel Dashboard 中設定 `ADMIN_PASSWORD`

### 4. 測試部署
- 前台：`https://your-domain.vercel.app/`
- 管理後台：`https://your-domain.vercel.app/admin`

---

## 📱 使用流程

### 一般用戶
1. 訪問前台頁面
2. 使用 LINE 登入查看個人狀態
3. 瀏覽配對狀態和統計資訊
4. 聯繫管理員進行報名

### 管理員
1. 訪問 `/admin` 頁面
2. 輸入管理員密碼登入
3. 進行報名管理、配對操作
4. 設定系統參數
5. 查看活動日誌

---

## 🔧 如何取得 LINE Notify Token

### 步驟一：註冊 LINE Notify

1. **登入 LINE Developers**
   - 前往 [LINE Developers Console](https://developers.line.biz/console/)
   - 使用你的 LINE 帳號登入

2. **創建 Provider**
   - 點擊 "Login with LINE" → "LINE Notify"
   - 點擊 "Create"

3. **設定 Provider 資訊**
   - **Provider name**: 輸入你的服務名稱（如：MJ999 配對系統）
   - **Provider description**: 輸入服務描述
   - **Email address**: 輸入你的 email
   - **Website URL**: 輸入你的網站 URL（如：`https://your-domain.vercel.app/`）
   - 勾選 "Agree to the terms of use"
   - 點擊 "Create"

### 步驟二：發布 Token

1. **創建 Token**
   - 在創建的 Provider 頁面中，點擊 "Create token"
   - **Token name**: 輸入 token 名稱（如：MJ999-Production）
   - **Notification target**: 選擇 "1-on-1 chat"（個人聊天）
   - 勾選 "Agree to the terms of use"
   - 點擊 "Issue"

2. **複製 Token**
   - 成功創建後，會顯示一個長串的 Token
   - **立即複製這個 Token**（離開頁面後就無法再次查看）
   - 將 Token 複製到 Vercel 環境變數中

### 步驟三：測試 Token

```bash
# 測試 LINE Notify 是否正常工作
curl -X POST https://notify-api.line.me/api/notify \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'message=測試訊息：MJ999 系統已啟用 LINE Notify'
```

### 重要提醒

⚠️ **Token 安全性**：
- Token 就像密碼，絕對不要公開分享
- 不要將 Token 提交到 Git 版本控制系統
- 定期更換 Token 以確保安全性

🔒 **建議做法**：
- 在 Vercel 中使用環境變數，不要寫死在程式碼中
- 設定 Token 權限，只允許發送通知給特定群組或個人

---

## 🛠️ 故障排除

### 常見問題

1. **管理員無法登入**
   - 檢查 `ADMIN_PASSWORD` 環境變數是否正確設定
   - 確認密碼沒有特殊字元問題

2. **API 403 錯誤**
   - 檢查請求頭是否包含正確的認證資訊
   - 確認 Token 沒有過期

3. **前後台樣式異常**
   - 確認 `style.css` 檔案已正確部署
   - 檢查檔案路徑是否正確

### 除錯工具
- **瀏覽器開發者工具** - 檢查 Console 錯誤
- **Vercel Function Logs** - 查看 API 執行日誌
- **Network 標籤** - 檢查請求和回應

---

## 📈 效能優化

### 已實施優化
- **代碼分割** - 前後台使用不同的 JS 檔案
- **懶加載** - 按需載入功能模組
- **快取策略** - 合理使用 localStorage 快取

### 建議優化
- **CDN 加速** - 靜態資源使用 CDN
- **圖片優化** - 壓縮用戶頭貼
- **API 快取** - 適當快取公開 API 回應

---

## 🔮 未來功能

### 計劃中的功能
- **真實後端整合** - 替換 Mock API
- **即時通知** - WebSocket 即時更新
- **多語言支援** - 國際化支援
- **行動應用** - PWA 支援

---

## 📞 技術支援

如遇到部署問題，請：
1. 檢查 Vercel 部署日誌
2. 確認環境變數設定
3. 驗證檔案結構完整性
4. 測試本地環境是否正常

部署完成後，系統將具備完整的前後台分離架構和安全保護機制！🎯✨
