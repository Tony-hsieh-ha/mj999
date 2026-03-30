// Mock API - 模擬後端服務
class MockAPI {
    constructor() {
        this.rooms = this.loadRooms(); // 改為房間列表
        this.lineNotifyToken = null;
        this.notificationCooldown = new Map();
        this.blacklist = this.loadBlacklist();
        this.playerRatings = this.loadPlayerRatings();
        this.waitingList = this.loadWaitingList();
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
                    const message = `【MJ999 揪團】目前有一桌 3 缺 1！想打的快來報名！地點：[預設店名]\n\n目前玩家：${playerNames}\n金額：$${amount}`;
                    
                    // 發送通知
                    const result = await this.sendLineNotification(message);
                    
                    if (result.success) {
                        // 設置冷卻時間
                        this.setNotificationCooldown(cooldownKey);
                        console.log(`已發送差一人通知：$${amount}`);
                        
                        // 記錄通知日誌
                        this.logNotification(amount, players, '3缺1');
                    }
                }
            }
        }
    }

    // 記錄通知日誌
    logNotification(amount, players, type) {
        const notification = {
            amount,
            players: players.map(p => p.nickname),
            type,
            timestamp: new Date().toISOString()
        };
        
        // 儲存通知日誌
        const notifications = JSON.parse(localStorage.getItem('notificationLog') || '[]');
        notifications.unshift(notification);
        
        // 只保留最近 50 條記錄
        if (notifications.length > 50) {
            notifications.splice(50);
        }
        
        localStorage.setItem('notificationLog', JSON.stringify(notifications));
    }

    // 獲取通知日誌
    getNotificationLog() {
        return JSON.parse(localStorage.getItem('notificationLog') || '[]');
    }

    // 黑名單系統
    loadBlacklist() {
        const saved = localStorage.getItem('blacklist');
        return saved ? JSON.parse(saved) : [];
    }

    saveBlacklist() {
        localStorage.setItem('blacklist', JSON.stringify(this.blacklist));
    }

    addToBlacklist(playerName, reason = '放鳥') {
        if (!this.blacklist.find(p => p.name === playerName)) {
            this.blacklist.push({
                name: playerName,
                reason: reason,
                timestamp: new Date().toISOString(),
                addedBy: '管理員'
            });
            this.saveBlacklist();
            return true;
        }
        return false;
    }

    removeFromBlacklist(playerName) {
        const index = this.blacklist.findIndex(p => p.name === playerName);
        if (index > -1) {
            this.blacklist.splice(index, 1);
            this.saveBlacklist();
            return true;
        }
        return false;
    }

    isBlacklisted(playerName) {
        return this.blacklist.some(p => p.name === playerName);
    }

    getBlacklistInfo(playerName) {
        return this.blacklist.find(p => p.name === playerName);
    }

    // 戰力分級系統
    loadPlayerRatings() {
        const saved = localStorage.getItem('playerRatings');
        return saved ? JSON.parse(saved) : {};
    }

    savePlayerRatings() {
        localStorage.setItem('playerRatings', JSON.stringify(this.playerRatings));
    }

    setPlayerRating(playerName, rating) {
        this.playerRatings[playerName] = {
            rating: rating,
            timestamp: new Date().toISOString()
        };
        this.savePlayerRatings();
    }

    getPlayerRating(playerName) {
        return this.playerRatings[playerName]?.rating || '新手';
    }

    // 候補計時系統
    loadWaitingList() {
        const saved = localStorage.getItem('waitingList');
        return saved ? JSON.parse(saved) : {};
    }

    saveWaitingList() {
        localStorage.setItem('waitingList', JSON.stringify(this.waitingList));
    }

    addToWaitingList(playerName, timestamp = null) {
        this.waitingList[playerName] = timestamp || new Date().toISOString();
        this.saveWaitingList();
    }

    removeFromWaitingList(playerName) {
        delete this.waitingList[playerName];
        this.saveWaitingList();
    }

    getWaitingMinutes(playerName) {
        const timestamp = this.waitingList[playerName];
        if (!timestamp) return 0;
        
        const now = new Date();
        const waitTime = new Date(timestamp);
        const diffMinutes = Math.floor((now - waitTime) / (1000 * 60));
        return diffMinutes;
    }
    // 載入房間資料
    loadRooms() {
        const savedRooms = localStorage.getItem('mockRooms');
        return savedRooms ? JSON.parse(savedRooms) : this.getDefaultRooms();
    }

    // 獲取預設房間
    getDefaultRooms() {
        return [
            {
                id: 1,
                roomTitle: '明星桌',
                score: '50/20',
                gameType: '輸贏底台',
                startTime: '滿開',
                currentPlayers: 2,
                maxPlayers: 4,
                players: [
                    { id: 1, nickname: '玩家A', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 2, nickname: '玩家B', avatar: null, joinedAt: new Date().toISOString() }
                ],
                status: 'waiting',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                roomTitle: '新手桌',
                score: '30/10',
                gameType: '輸贏底台',
                startTime: '14:00',
                currentPlayers: 3,
                maxPlayers: 4,
                players: [
                    { id: 3, nickname: '玩家C', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 4, nickname: '玩家D', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 5, nickname: '玩家E', avatar: null, joinedAt: new Date().toISOString() }
                ],
                status: 'waiting',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                roomTitle: '高手桌',
                score: '100/20',
                gameType: '輸贏底台',
                startTime: '滿開',
                currentPlayers: 4,
                maxPlayers: 4,
                players: [
                    { id: 6, nickname: '玩家F', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 7, nickname: '玩家G', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 8, nickname: '玩家H', avatar: null, joinedAt: new Date().toISOString() },
                    { id: 9, nickname: '玩家I', avatar: null, joinedAt: new Date().toISOString() }
                ],
                status: 'playing',
                createdAt: new Date().toISOString()
            }
        ];
    }

    // 儲存房間資料
    saveRooms() {
        localStorage.setItem('mockRooms', JSON.stringify(this.rooms));
    }

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 檢查是否成桌（加入防呆機制）
    async checkForCompleteTable(amount) {
        // 模擬API延遲
        await this.delay(500);
        
        // 獲取所有報名資料
        const registrations = this.getRegistrations();
        const waitingRegistrations = registrations.filter(reg => 
            reg.status === 'waiting' && reg.amount === amount
        );

        // 防呆機制：嚴格檢查人數上限
        if (waitingRegistrations.length > 4) {
            console.warn('警告：等待人數超過 4 人上限');
            return { error: '等待人數超過上限，請檢查系統資料' };
        }

        // 檢查重複玩家名稱
        const duplicateNames = this.checkDuplicateNames(waitingRegistrations);
        if (duplicateNames.length > 0) {
            console.warn('警告：發現重複玩家名稱', duplicateNames);
            return { error: `發現重複玩家名稱：${duplicateNames.join(', ')}` };
        }

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

    // 檢查重複玩家名稱
    checkDuplicateNames(registrations) {
        const nameCount = {};
        const duplicates = [];
        
        registrations.forEach(reg => {
            const name = reg.nickname;
            if (nameCount[name]) {
                nameCount[name]++;
                if (nameCount[name] === 2) {
                    duplicates.push(name);
                }
            } else {
                nameCount[name] = 1;
            }
        });
        
        return duplicates;
    }

    // 檢查桌子人數上限
    validateTableSize(tablePlayers) {
        if (tablePlayers.length > 4) {
            return {
                valid: false,
                message: '每桌最多只能有 4 人，目前人數超過上限'
            };
        }
        
        if (tablePlayers.length < 0) {
            return {
                valid: false,
                message: '人數不能為負數'
            };
        }
        
        return { valid: true };
    }

    // 更新桌子狀態（加入觸發機制）
    async updateTableStatus(tableId, newStatus) {
        const table = this.tables.find(t => t.id === tableId);
        if (!table) {
            return { success: false, message: '桌子不存在' };
        }
        
        const oldStatus = table.status;
        table.status = newStatus;
        this.saveTables();
        
        // 自動觸發：當從 4 人調降回 3 人時
        if (oldStatus === 'playing' && newStatus === 'waiting' && table.players.length === 4) {
            // 將其中一個玩家移回等待狀態
            const playerToMove = table.players.pop();
            const registration = this.registrations.find(reg => reg.id === playerToMove.id);
            if (registration) {
                registration.status = 'waiting';
                this.saveRegistrations();
            }
            
            // 觸發 LINE Notify
            if (typeof lineNotify !== 'undefined') {
                await lineNotify.sendNotification(`【MJ999 狀態更新】$${table.amount} 桌次從遊戲中調整為等待中，目前 3 缺 1！`);
            }
            
            // 觸發前台紅色呼吸燈
            this.triggerNearCompleteAlert(table.amount);
        }
        
        return { success: true, table };
    }

    // 觸發前台紅色呼吸燈
    triggerNearCompleteAlert(amount) {
        // 設置觸發標記
        localStorage.setItem('nearCompleteTrigger', JSON.stringify({
            amount: amount,
            timestamp: Date.now()
        }));
        
        // 5 秒後清除標記
        setTimeout(() => {
            localStorage.removeItem('nearCompleteTrigger');
        }, 5000);
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
