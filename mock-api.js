// Mock API - 模擬後端服務
class MockAPI {
    constructor() {
        this.tables = this.loadTables();
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
