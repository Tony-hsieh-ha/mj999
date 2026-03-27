# LINE API 整合技術說明

## 🎯 功能概述

MJ999 系統已實現完整的自動成桌與 LINE 通知功能，包含：
- 希望開打時間設定
- 自動成桌判定（4人同金額）
- 兩階段 LINE 通知機制
- 確認機制與狀態追蹤

## 📋 當前實作狀態

### ✅ 已完成（Mock API 版本）
- **前端完整邏輯** - 所有用戶介面和交互
- **Mock API 模擬** - 完整的後端邏輯模擬
- **成桌判定** - 自動檢測4人同金額
- **確認機制** - 同意/不同意按鈕
- **狀態追蹤** - 即時更新確認狀態
- **UI 顯示** - 成桌確認介面

### 🔄 需要真實 API 的部分

## 🛠️ 真實 LINE API 整合需求

### 1. LINE Messaging API

**所需資訊：**
- **Channel Access Token** - 長期有效權杖
- **Webhook URL** - 接收用戶回覆的端點
- **User ID 獲取** - 從 LINE Login 獲得的用戶ID

**API 端點：**
```
POST https://api.line.me/v2/bot/message/push
```

**請求格式：**
```javascript
{
  "to": "USER_ID",
  "messages": [
    {
      "type": "template",
      "altText": "成桌確認",
      "template": {
        "type": "buttons",
        "text": "🎯 成桌通知！\n\n金額：$100\n玩家：A, B, C, D\n開打時間：20:00\n\n請確認是否同意成桌：",
        "actions": [
          {
            "type": "postback",
            "label": "✅ 同意",
            "data": "action=agree&table_id=12345"
          },
          {
            "type": "postback", 
            "label": "❌ 不同意",
            "data": "action=disagree&table_id=12345"
          }
        ]
      }
    }
  ]
}
```

### 2. LINE Notify API（可選）

**用途：** 廣播通知給管理員
**所需資訊：**
- **Notify Token** - 從 LINE Notify 獲得

### 3. Webhook 處理

**需要後端端點：**
```
POST /webhook/line
```

**處理邏輯：**
```javascript
// 接收用戶回覆
app.post('/webhook/line', (req, res) => {
  const events = req.body.events;
  
  events.forEach(event => {
    if (event.type === 'postback') {
      const data = new URLSearchParams(event.postback.data);
      const action = data.get('action');
      const tableId = data.get('table_id');
      const userId = event.source.userId;
      
      // 處理同意/不同意
      mockAPI.handlePlayerResponse(userId, tableId, action);
    }
  });
});
```

## 🔧 從 Mock API 到真實 API 的遷移步驟

### 步驟1：獲取 LINE 開發者資源

1. **LINE Messaging API Channel**
   - 創建 Messaging API Channel
   - 獲得 Channel Secret 和 Channel Access Token
   - 設定 Webhook URL

2. **後端服務**
   - 部署簡單的 Node.js/Express 服務
   - 處理 Webhook 事件
   - 調用 LINE Messaging API

### 步驟2：替換 Mock API 調用

**在 `mock-api.js` 中替換：**

```javascript
// 當前（Mock）
async sendLineMessage(userId, message) {
    await this.delay(800);
    console.log(`模擬發送LINE訊息給 ${userId}:`, message);
    return { success: true, messageId: 'mock_' + Date.now() };
}

// 改為真實 API
async sendLineMessage(userId, message) {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify({
            to: userId,
            messages: [{
                type: 'text',
                text: message
            }]
        })
    });
    
    return await response.json();
}
```

### 步驟3：用戶ID對應

**需要建立 LINE User ID 與系統用戶的對應：**

```javascript
// 在 LINE Login 時保存用戶ID
const userInfo = {
    userId: profileData.userId,  // LINE User ID
    displayName: profileData.displayName,
    pictureUrl: profileData.pictureUrl,
    systemUserId: registration.id  // 系統內部ID
};
```

## 📱 當前可測試功能

### ✅ 完全可測試
- 報名與時間選擇
- 金額統計顯示
- 取消/更改報名
- 成桌判定邏輯
- 確認按鈕介面
- 狀態更新

### 🔄 模擬測試
- LINE 通知（Console 顯示）
- 用戶回覆處理（點擊按鈕模擬）

## 🚀 部署建議

### 前端部署
1. **Vercel** - 已配置完成
2. **靜態檔案** - 所有功能都可正常運行

### 後端需求（真實 LINE API）
1. **Node.js 服務** - 處理 Webhook
2. **資料庫** - 儲存成桌狀態
3. **環境變數** - LINE API 權杖

## 📞 技術支援

如需真實 LINE API 整合，需要：
1. LINE 開發者帳號
2. Webhook 服務部署
3. API 權杖管理

目前的 Mock API 版本已完整實現所有前端邏輯，可直接測試用戶體驗！
