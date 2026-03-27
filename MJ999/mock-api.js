// Mock API 模擬後端服務
class MockAPI {
    constructor() {
        this.tables = []; // 成桌記錄
        this.confirmations = {}; // 確認狀態記錄
        this.lineNotifyToken = localStorage.getItem('lineNotifyToken') || '';
    }

    // 模擬延遲
    delay(ms = 1000) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 檢查是否成桌
    async checkForCompleteTable(amount) {
        await this.delay(500); // 模擬API延遲
        
        const registrations = JSON.parse(localStorage.getItem('mahjongRegistrations') || '[]');
        const waitingPlayers = registrations.filter(reg => 
            reg.status === 'waiting' && reg.amount === amount
        );

        if (waitingPlayers.length === 4) {
            // 檢查是否已經有成桌記錄
            const existingTable = this.tables.find(table => 
                table.amount === amount && table.status === 'pending'
            );
            
            if (!existingTable) {
                return await this.createTable(waitingPlayers, amount);
            }
        }
        
        return null;
    }

    // 創建成桌
    async createTable(players, amount) {
        await this.delay(800);
        
        const table = {
            id: Date.now(),
            amount: amount,
            players: players,
            status: 'pending', // pending, confirmed, cancelled
            createdAt: new Date().toISOString(),
            confirmations: {}
        };

        // 初始化確認狀態
        players.forEach(player => {
            table.confirmations[player.id] = {
                status: 'pending', // pending, agreed, disagreed
                respondedAt: null
            };
        });

        this.tables.push(table);
        this.saveTables();

        // 發送第一階段通知
        await this.sendFirstStageNotification(table);

        return table;
    }

    // 發送第一階段通知
    async sendFirstStageNotification(table) {
        await this.delay(1000);
        
        const message = `🎯 成桌通知！\n\n` +
            `金額：$${table.amount}\n` +
            `玩家：${table.players.map(p => p.nickname).join(', ')}\n` +
            `預計開打時間：${this.getMostCommonTime(table.players)}\n\n` +
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

    // 處理玩家回覆
    async handlePlayerResponse(playerId, tableId, response) {
        await this.delay(500);
        
        const table = this.tables.find(t => t.id === tableId);
        if (!table) {
            throw new Error('找不到成桌記錄');
        }

        const player = table.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('玩家不在成桌名單中');
        }

        // 更新確認狀態
        table.confirmations[playerId] = {
            status: response,
            respondedAt: new Date().toISOString()
        };

        this.saveTables();

        // 檢查是否所有人都回覆了
        const allResponded = Object.values(table.confirmations).every(
            confirmation => confirmation.status !== 'pending'
        );

        if (allResponded) {
            const allAgreed = Object.values(table.confirmations).every(
                confirmation => confirmation.status === 'agreed'
            );

            if (allAgreed) {
                await this.sendSecondStageNotification(table);
                table.status = 'confirmed';
            } else {
                table.status = 'cancelled';
                await this.sendCancellationNotification(table);
            }
            
            this.saveTables();
        }

        return { success: true, table };
    }

    // 發送第二階段通知
    async sendSecondStageNotification(table) {
        await this.delay(1000);
        
        const message = `✅ 成桌確定！\n\n` +
            `金額：$${table.amount}\n` +
            `玩家：${table.players.map(p => p.nickname).join(', ')}\n` +
            `開打時間：${this.getMostCommonTime(table.players)}\n\n` +
            `請準時到場，祝您遊戲愉快！🎯`;

        for (const player of table.players) {
            console.log(`發送確認通知給 ${player.nickname}:`, message);
        }

        return { success: true, message: '第二階段通知已發送' };
    }

    // 發送取消通知
    async sendCancellationNotification(table) {
        await this.delay(1000);
        
        const message = `❌ 成桌取消\n\n` +
            `由於部分玩家不同意，成桌已取消。\n` +
            `請重新報名或調整時間。`;

        for (const player of table.players) {
            console.log(`發送取消通知給 ${player.nickname}:`, message);
        }

        return { success: true, message: '取消通知已發送' };
    }

    // 獲取最常見的開打時間
    getMostCommonTime(players) {
        const timeCounts = {};
        players.forEach(player => {
            const time = player.preferredTime || '未設定';
            timeCounts[time] = (timeCounts[time] || 0) + 1;
        });

        const mostCommon = Object.entries(timeCounts)
            .sort(([,a], [,b]) => b - a)[0];

        return mostCommon ? mostCommon[0] : '未設定';
    }

    // 獲取成桌狀態
    getTableStatus(tableId) {
        const table = this.tables.find(t => t.id === tableId);
        return table || null;
    }

    // 獲取所有成桌
    getAllTables() {
        return this.tables;
    }

    // 保存成桌記錄
    saveTables() {
        localStorage.setItem('mockTables', JSON.stringify(this.tables));
    }

    // 載入成桌記錄
    loadTables() {
        const saved = localStorage.getItem('mockTables');
        if (saved) {
            this.tables = JSON.parse(saved);
        }
    }

    // 模擬LINE Messaging API
    async sendLineMessage(userId, message) {
        await this.delay(800);
        
        // 在實際環境中，這裡會調用LINE Messaging API
        console.log(`模擬發送LINE訊息給 ${userId}:`, message);
        
        return {
            success: true,
            messageId: 'mock_' + Date.now()
        };
    }

    // 模擬LINE Notify
    async sendLineNotify(message) {
        await this.delay(800);
        
        if (!this.lineNotifyToken) {
            console.warn('LINE Notify Token 未設定');
            return { success: false, error: 'Token未設定' };
        }

        console.log(`模擬發送LINE Notify:`, message);
        
        return {
            success: true,
            messageId: 'notify_' + Date.now()
        };
    }
}

// 創建全域Mock API實例
const mockAPI = new MockAPI();
mockAPI.loadTables();
