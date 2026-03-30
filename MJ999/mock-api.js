// Mock API - 模擬後端服務
class MockAPI {
    constructor() {
        this.tables = this.loadTables();
        this.lineNotifyToken = null;
        this.notificationCooldown = new Map(); // 防刷版機制
        this.initLineNotify();
    }

    // 初始化 LINE Notify
    async initLineNotify() {
        // 從環境變數獲取 Token
        if (typeof process !== 'undefined' && process.env?.LINE_NOTIFY_TOKEN) {
            this.lineNotifyToken = process.env.LINE_NOTIFY_TOKEN;
        } else {
            // 從 localStorage 獲取（開發用）
            this.lineNotifyToken = localStorage.getItem('lineNotifyToken') || '';
        }
    }

    // 發送 LINE Notify 通知
    async sendLineNotification(message) {
        if (!this.lineNotifyToken) {
            console.warn('LINE Notify Token 未設定');
            return { success: false, message: 'Token 未設定' };
        }

        try {
            const response = await fetch('https://notify-api.line.me/api/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${this.lineNotifyToken}`
                },
                body: `message=${encodeURIComponent(message)}`
            });

            if (response.ok) {
                console.log('LINE Notify 發送成功:', message);
                return { success: true, message: '通知發送成功' };
            } else {
                const errorText = await response.text();
                console.error('LINE Notify 發送失敗:', errorText);
                return { success: false, message: `發送失敗: ${errorText}` };
            }
        } catch (error) {
            console.error('LINE Notify 發送錯誤:', error);
            return { success: false, message: `發送錯誤: ${error.message}` };
        }
    }

    // 檢查通知冷卻時間
    isNotificationCooldown(key, cooldownMinutes = 10) {
        const lastNotification = this.notificationCooldown.get(key);
        if (!lastNotification) return false;
        
        const timeDiff = Date.now() - lastNotification;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        
        return timeDiff < cooldownMs;
    }

    // 設置通知冷卻時間
    setNotificationCooldown(key) {
        this.notificationCooldown.set(key, Date.now());
        
        // 自動清理過期的冷卻記錄
        setTimeout(() => {
            this.notificationCooldown.delete(key);
        }, 10 * 60 * 1000); // 10分鐘後清理
    }

    // 檢查湊桌差一人並發送通知
    async checkAndNotifyNearComplete() {
        const registrations = this.getRegistrations();
        const waitingRegistrations = registrations.filter(reg => reg.status === 'waiting');
        
        // 按金額分組
        const amountGroups = {};
        waitingRegistrations.forEach(reg => {
            if (!amountGroups[reg.amount]) {
                amountGroups[reg.amount] = [];
            }
            amountGroups[reg.amount].push(reg);
        });
        
        // 檢查每個金額組
        for (const [amount, players] of Object.entries(amountGroups)) {
            if (players.length === 3) { // 差一人滿桌
                const cooldownKey = `near_complete_${amount}`;
                
                // 檢查是否在冷卻時間內
                if (!this.isNotificationCooldown(cooldownKey)) {
                    const playerNames = players.map(p => p.nickname).join(', ');
                    const message = `【MJ999 揪團】目前有一桌差 1 人！地點：[店名/桌號]，想打的快來報名！\n\n目前玩家：${playerNames}\n金額：$${amount}`;
                    
                    // 發送通知
                    const result = await this.sendLineNotification(message);
                    
                    if (result.success) {
                        // 設置冷卻時間
                        this.setNotificationCooldown(cooldownKey);
                        console.log(`已發送差一人通知：$${amount}`);
                    }
                }
            }
        }
    }

    // 載入桌子資料
    loadTables() {
        const savedTables = localStorage.getItem('mockTables');
        return savedTables ? JSON.parse(savedTables) : [];
    }

    // 儲存桌子資料
    saveTables() {
        localStorage.setItem('mockTables', JSON.stringify(this.tables));
    }

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 檢查是否成桌
    async checkForCompleteTable(amount) {
        // 模擬API延遲
        await this.delay(500);
        
        // 獲取所有報名資料
        const registrations = this.getRegistrations();
        const waitingRegistrations = registrations.filter(reg => 
            reg.status === 'waiting' && reg.amount === amount
        );

        // 檢查是否有4人
        if (waitingRegistrations.length >= 4) {
            // 取前4人
            const tablePlayers = waitingRegistrations.slice(0, 4);
            
            // 創建桌子
            const table = {
                id: Date.now(),
                amount: amount,
                players: tablePlayers,
                status: 'pending',
                confirmations: {},
                createdAt: new Date().toISOString()
            };

            // 初始化確認狀態
            tablePlayers.forEach(player => {
                table.confirmations[player.id] = {
                    status: 'pending',
                    respondedAt: null
                };
            });

            this.tables.push(table);
            this.saveTables();

            // 發送第一階段通知
            await this.sendFirstStageNotification(table);

            return table;
        }

        // 檢查是否需要發送差一人通知
        await this.checkAndNotifyNearComplete();

        return null;
    }

    // 處理玩家回應
    async handlePlayerResponse(playerId, tableId, response) {
        await this.delay(300);

        const table = this.tables.find(t => t.id === tableId);
        if (!table) {
            throw new Error('桌子不存在');
        }

        // 更新玩家回應
        if (table.confirmations[playerId]) {
            table.confirmations[playerId] = {
                status: response,
                respondedAt: new Date().toISOString()
            };
        }

        // 檢查是否所有人都回覆了
        const allResponses = Object.values(table.confirmations);
        const allResponded = allResponses.every(r => r.status !== 'pending');
        
        if (allResponded) {
            const allAgreed = allResponses.every(r => r.status === 'agreed');
            
            if (allAgreed) {
                table.status = 'confirmed';
                await this.sendSecondStageNotification(table);
            } else {
                table.status = 'cancelled';
                await this.sendCancellationNotification(table);
            }
        }

        this.saveTables();
        return { success: true, table };
    }

    // 發送第一階段通知
    async sendFirstStageNotification(table) {
        await this.delay(1000);
        
        const timeRanges = table.players.map(player => {
            if (player.earliestTime && player.latestTime) {
                return `${player.earliestTime} ~ ${player.latestTime}`;
            }
            return '未設定';
        });
        
        const message = `🎯 成桌通知！\n\n` +
            `金額：$${table.amount}\n` +
            `玩家：${table.players.map(p => p.nickname).join(', ')}\n` +
            `時間區間：${timeRanges.join(', ')}\n\n` +
            `請確認是否同意成桌：\n` +
            `✅ [同意]\n` +
            `❌ [不同意]`;

        // 模擬發送LINE通知給所有玩家
        for (const player of table.players) {
            console.log(`發送通知給 ${player.nickname}:`, message);
            // 在實際環境中，這裡會調用LINE Messaging API
        }

        return { success: true, message: '第一階段通知已發送' };
    }

    // 發送第二階段通知
    async sendSecondStageNotification(table) {
        await this.delay(1000);
        
        const timeRanges = table.players.map(player => {
            if (player.earliestTime && player.latestTime) {
                return `${player.earliestTime} ~ ${player.latestTime}`;
            }
            return '未設定';
        });
        
        const message = `✅ 成桌確定！\n\n` +
            `金額：$${table.amount}\n` +
            `玩家：${table.players.map(p => p.nickname).join(', ')}\n` +
            `時間區間：${timeRanges.join(', ')}\n\n` +
            `請準時到場，祝您遊戲愉快！🎯`;

        for (const player of table.players) {
            console.log(`發送確認通知給 ${player.nickname}:`, message);
        }

        return { success: true, message: '第二階段通知已發送' };
    }

    // 發送取消通知
    async sendCancellationNotification(table) {
        await this.delay(500);
        
        const message = `❌ 成桌取消\n\n` +
            `金額：$${table.amount}\n` +
            `玩家：${table.players.map(p => p.nickname).join(', ')}\n\n` +
            `由於有玩家不同意，成桌已取消。`;

        for (const player of table.players) {
            console.log(`發送取消通知給 ${player.nickname}:`, message);
        }

        return { success: true, message: '取消通知已發送' };
    }

    // 獲取所有桌子
    getTables() {
        return this.tables;
    }

    // 獲取報名資料（從localStorage）
    getRegistrations() {
        const savedRegistrations = localStorage.getItem('mahjongRegistrations');
        return savedRegistrations ? JSON.parse(savedRegistrations) : [];
    }

    // 清除所有桌子
    clearTables() {
        this.tables = [];
        this.saveTables();
    }
}

// 創建全域 Mock API 實例
const mockAPI = new MockAPI();
