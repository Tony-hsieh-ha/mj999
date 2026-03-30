// 智能配對系統
class RegistrationSystem {
    constructor() {
        this.registrations = [];
        this.tables = [];
        this.lineNotifyToken = localStorage.getItem('lineNotifyToken') || '';
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadData();
        this.loadUserInfo();
        this.setupEventListeners();
        this.updateUI();
    }

    // 用戶管理
    loadUserInfo() {
        const savedUserInfo = localStorage.getItem('lineUserInfo');
        if (savedUserInfo) {
            this.currentUser = JSON.parse(savedUserInfo);
            this.displayUserProfile();
        } else {
            this.showLoginPrompt();
        }
    }

    displayUserProfile() {
        const userProfile = document.getElementById('userProfile');
        const loginPrompt = document.getElementById('loginPrompt');
        const registrationForm = document.getElementById('registrationForm');
        const nicknameGroup = document.getElementById('nicknameGroup');
        const nicknameInput = document.getElementById('nickname');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');

        if (this.currentUser && userProfile) {
            userProfile.style.display = 'block';
            loginPrompt.style.display = 'none';
            registrationForm.style.display = 'block';
            
            // 顯示用戶資訊
            if (userAvatar) userAvatar.src = this.currentUser.pictureUrl;
            if (userName) userName.textContent = this.currentUser.displayName;
            
            // 自動填入暱稱
            if (nicknameInput && this.currentUser.displayName) {
                nicknameInput.value = this.currentUser.displayName;
                // 如果是LINE用戶，隱藏暱稱輸入框
                if (this.currentUser.userId && !this.currentUser.userId.startsWith('manual_')) {
                    nicknameGroup.style.display = 'none';
                } else {
                    nicknameGroup.style.display = 'block';
                }
            }
        } else {
            this.showLoginPrompt();
        }
    }

    showLoginPrompt() {
        const userProfile = document.getElementById('userProfile');
        const loginPrompt = document.getElementById('loginPrompt');
        const registrationForm = document.getElementById('registrationForm');

        if (userProfile) userProfile.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (registrationForm) registrationForm.style.display = 'none';
    }

    logout() {
        localStorage.removeItem('lineUserInfo');
        localStorage.removeItem('loginMethod');
        this.currentUser = null;
        this.showLoginPrompt();
        this.showNotification('已登出', 'info');
    }
    loadData() {
        const savedRegistrations = localStorage.getItem('mahjongRegistrations');
        const savedTables = localStorage.getItem('mahjongTables');
        
        if (savedRegistrations) {
            this.registrations = JSON.parse(savedRegistrations);
        }
        
        if (savedTables) {
            this.tables = JSON.parse(savedTables);
        }
    }

    saveData() {
        localStorage.setItem('mahjongRegistrations', JSON.stringify(this.registrations));
        localStorage.setItem('mahjongTables', JSON.stringify(this.tables));
    }

    // 事件監聽器設置
    setupEventListeners() {
        // 導航按鈕
        document.getElementById('playerView').addEventListener('click', () => {
            this.showSection('player');
        });

        document.getElementById('adminView').addEventListener('click', () => {
            this.showSection('admin');
        });

        // 報名表單
        document.getElementById('registrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });

        // 登出按鈕
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // 初始化時間選項
        this.initializeTimeOptions();

        // 管理後台按鈕
        document.getElementById('createTable').addEventListener('click', () => {
            this.createTable();
        });

        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('確定要清空所有報名嗎？')) {
                this.clearAllRegistrations();
            }
        });

        document.getElementById('lineNotifySettings').addEventListener('click', () => {
            this.showLineNotifySettings();
        });
    }

    // 頁面切換
    showSection(section) {
        const playerSection = document.getElementById('playerSection');
        const adminSection = document.getElementById('adminSection');
        const playerView = document.getElementById('playerView');
        const adminView = document.getElementById('adminView');

        if (section === 'player') {
            playerSection.classList.add('active');
            adminSection.classList.remove('active');
            playerView.classList.add('active');
            adminView.classList.remove('active');
        } else {
            playerSection.classList.remove('active');
            adminSection.classList.add('active');
            playerView.classList.remove('active');
            adminView.classList.add('active');
        }

        this.updateUI();
    }

    // 處理報名
    handleRegistration() {
        const nickname = this.currentUser ? this.currentUser.displayName : document.getElementById('nickname').value.trim();
        const amount = document.querySelector('input[name="amount"]:checked');
        const earliestTime = document.getElementById('earliestTime').value;
        const latestTime = document.getElementById('latestTime').value;

        if (!nickname) {
            this.showNotification('請先登入', 'error');
            return;
        }

        if (!amount) {
            this.showNotification('請選擇金額', 'error');
            return;
        }

        if (!earliestTime || !latestTime) {
            this.showNotification('請選擇希望開打時間區間', 'error');
            return;
        }

        if (earliestTime >= latestTime) {
            this.showNotification('最晚時間必須晚於最早時間', 'error');
            return;
        }

        // 檢查是否已經報名
        if (this.registrations.some(reg => reg.nickname === nickname)) {
            this.showNotification('您已經報名了', 'error');
            return;
        }

        const registration = {
            id: Date.now(),
            nickname: nickname,
            amount: amount.value,
            earliestTime: earliestTime,
            latestTime: latestTime,
            timestamp: new Date().toISOString(),
            status: 'waiting'
        };

        this.registrations.push(registration);
        this.saveData();
        this.updateUI();

        // 清空表單
        document.getElementById('registrationForm').reset();
        this.resetTimeRange();
        
        this.showNotification(`報名成功！${nickname} 已報名 $${amount.value}，時間區間 ${earliestTime} ~ ${latestTime}`, 'success');
        
        // 發送 LINE Notify 通知（如果已設定）
        this.sendLineNotify(`新報名：${nickname} 報名 $${amount.value}，時間區間 ${earliestTime} ~ ${latestTime}`);
        
        // 檢查是否成桌
        this.checkForCompleteTable(amount.value);
    }

    // 取消報名
    cancelRegistration(registrationId) {
        const registration = this.registrations.find(reg => reg.id === registrationId);
        if (registration) {
            this.registrations = this.registrations.filter(reg => reg.id !== registrationId);
            this.saveData();
            this.updateUI();
            this.showNotification(`${registration.nickname} 已取消報名`, 'info');
            this.sendLineNotify(`${registration.nickname} 取消了報名`);
        }
    }

    // 初始化時間選項
    initializeTimeOptions() {
        const earliestSelect = document.getElementById('earliestTime');
        const latestSelect = document.getElementById('latestTime');
        
        if (!earliestSelect || !latestSelect) return;
        
        // 生成時間選項（30分鐘為單位）
        const timeOptions = this.generateTimeOptions();
        
        // 清空選項
        earliestSelect.innerHTML = '';
        latestSelect.innerHTML = '';
        
        // 添加選項
        timeOptions.forEach((time, index) => {
            const earliestOption = new Option(time, time);
            const latestOption = new Option(time, time);
            
            earliestSelect.add(earliestOption);
            latestSelect.add(latestOption);
        });
        
        // 設定預設值
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // 找到下一個30分鐘的時間點
        let nextHour = currentHour;
        let nextMinute = Math.ceil((currentMinute + 1) / 30) * 30;
        
        if (nextMinute >= 60) {
            nextHour += 1;
            nextMinute = 0;
        }
        
        const earliestDefault = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
        
        // 設定最晚時間為最早時間加3小時
        let latestHour = nextHour + 3;
        let latestMinute = nextMinute;
        
        if (latestHour >= 24) {
            latestHour = latestHour - 24;
        }
        
        const latestDefault = `${String(latestHour).padStart(2, '0')}:${String(latestMinute).padStart(2, '0')}`;
        
        // 設定預設值
        earliestSelect.value = earliestDefault;
        latestSelect.value = latestDefault;
        
        // 監聽最早時間變化，自動調整最晚時間
        earliestSelect.addEventListener('change', () => {
            this.adjustLatestTime();
        });
    }
    
    // 生成時間選項
    generateTimeOptions() {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                options.push(time);
            }
        }
        return options;
    }
    
    // 調整最晚時間
    adjustLatestTime() {
        const earliestSelect = document.getElementById('earliestTime');
        const latestSelect = document.getElementById('latestTime');
        
        if (!earliestSelect.value || !latestSelect.value) return;
        
        const earliestTime = earliestSelect.value;
        const [earliestHour, earliestMinute] = earliestTime.split(':').map(Number);
        
        // 計算最早時間加3小時
        let latestHour = earliestHour + 3;
        let latestMinute = earliestMinute;
        
        if (latestHour >= 24) {
            latestHour = latestHour - 24;
        }
        
        const suggestedLatest = `${String(latestHour).padStart(2, '0')}:${String(latestMinute).padStart(2, '0')}`;
        
        // 如果當前最晚時間早於建議時間，則更新
        if (latestSelect.value < earliestTime || latestSelect.value < suggestedLatest) {
            latestSelect.value = suggestedLatest;
        }
    }
    
    // 重置時間區間
    resetTimeRange() {
        this.initializeTimeOptions();
    }

    // 檢查是否成桌
    async checkForCompleteTable(amount) {
        try {
            const table = await mockAPI.checkForCompleteTable(amount);
            if (table) {
                this.showNotification(`🎯 成桌！$${amount} 已湊滿4人，正在發送通知...`, 'success');
                this.displayTableConfirmation(table);
            }
        } catch (error) {
            console.error('成桌檢查錯誤:', error);
        }
    }

    // 顯示成桌確認介面
    displayTableConfirmation(table) {
        const timeRanges = table.players.map(player => {
            if (player.earliestTime && player.latestTime) {
                return `${player.earliestTime} ~ ${player.latestTime}`;
            }
            return '未設定';
        });
        
        const confirmationHtml = `
            <div class="table-confirmation" style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border: 2px solid #ffd700; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-bottom: 15px;">🎯 成桌確認</h3>
                <div style="color: #ffffff; margin-bottom: 15px;">
                    <p><strong>金額：</strong>$${table.amount}</p>
                    <p><strong>玩家：</strong>${table.players.map(p => p.nickname).join(', ')}</p>
                    <p><strong>時間區間：</strong>${timeRanges.join(', ')}</p>
                </div>
                <div class="confirmation-status" id="confirmation-${table.id}">
                    ${this.renderConfirmationStatus(table)}
                </div>
            </div>
        `;
        
        // 在報名列表上方插入確認介面
        const registrationList = document.getElementById('registrationList');
        if (registrationList) {
            registrationList.insertAdjacentHTML('afterbegin', confirmationHtml);
        }
    }

    // 渲染確認狀態
    renderConfirmationStatus(table) {
        const currentUser = this.currentUser;
        const playerConfirmation = table.confirmations[currentUser?.id] || { status: 'pending' };
        
        if (playerConfirmation.status === 'pending' && table.players.some(p => p.id === currentUser?.id)) {
            return `
                <div class="user-confirmation-buttons" style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="window.registrationSystem.respondToTable(${table.id}, 'agreed')" class="action-btn confirm-btn">✅ 同意</button>
                    <button onclick="window.registrationSystem.respondToTable(${table.id}, 'disagreed')" class="action-btn cancel-btn">❌ 不同意</button>
                </div>
            `;
        } else if (playerConfirmation.status !== 'pending') {
            return `
                <div style="text-align: center; color: #ffffff;">
                    您已${playerConfirmation.status === 'agreed' ? '同意' : '不同意'}成桌
                </div>
            `;
        }
        
        return '<div style="text-align: center; color: #cccccc;">等待玩家回覆...</div>';
    }

    // 回應成桌確認
    async respondToTable(tableId, response) {
        try {
            const currentUser = this.currentUser;
            if (!currentUser) {
                this.showNotification('請先登入', 'error');
                return;
            }

            const result = await mockAPI.handlePlayerResponse(currentUser.id, tableId, response);
            
            if (result.success) {
                const table = result.table;
                const statusElement = document.getElementById(`confirmation-${tableId}`);
                if (statusElement) {
                    statusElement.innerHTML = this.renderConfirmationStatus(table);
                }
                
                if (table.status === 'confirmed') {
                    this.showNotification('✅ 成桌確定！請準時到場', 'success');
                    // 將這4個玩家設為已配對
                    table.players.forEach(player => {
                        const registration = this.registrations.find(reg => reg.id === player.id);
                        if (registration) {
                            registration.status = 'matched';
                        }
                    });
                    this.saveData();
                    this.updateUI();
                } else if (table.status === 'cancelled') {
                    this.showNotification('❌ 成桌取消', 'info');
                }
            }
        } catch (error) {
            console.error('回應成桌錯誤:', error);
            this.showNotification('操作失敗，請重試', 'error');
        }
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
    changeRegistrationAmount(registrationId) {
        const registration = this.registrations.find(reg => reg.id === registrationId);
        if (registration) {
            const newAmount = prompt('請選擇新的金額 (30/10, 60/20, 100/20, 200/50):', registration.amount);
            if (newAmount && ['30/10', '60/20', '100/20', '200/50'].includes(newAmount)) {
                registration.amount = newAmount;
                registration.timestamp = new Date().toISOString();
                this.saveData();
                this.updateUI();
                this.showNotification(`${registration.nickname} 已更改金額為 $${newAmount}`, 'success');
                this.sendLineNotify(`${registration.nickname} 更改報名金額為 $${newAmount}`);
            } else if (newAmount) {
                this.showNotification('請選擇有效的金額選項', 'error');
            }
        }
    }

    // 創建桌子
    createTable() {
        const waitingRegistrations = this.registrations.filter(reg => reg.status === 'waiting');
        
        if (waitingRegistrations.length < 4) {
            this.showNotification('需要至少4人才能開桌', 'error');
            return;
        }

        const tablePlayers = waitingRegistrations.slice(0, 4);
        const table = {
            id: Date.now(),
            players: tablePlayers,
            timestamp: new Date().toISOString(),
            status: 'playing'
        };

        // 更新報名狀態
        tablePlayers.forEach(player => {
            const registration = this.registrations.find(reg => reg.id === player.id);
            if (registration) {
                registration.status = 'playing';
            }
        });

        this.tables.push(table);
        this.saveData();
        this.updateUI();

        const playerNames = tablePlayers.map(p => p.nickname).join(', ');
        this.showNotification(`桌子已創建！玩家：${playerNames}`, 'success');
        
        // 發送 LINE Notify 通知
        this.sendLineNotify(`開桌成功！玩家：${playerNames}`);
    }

    // 清空所有報名
    clearAllRegistrations() {
        this.registrations = [];
        this.tables = [];
        this.saveData();
        this.updateUI();
        this.showNotification('所有報名已清空', 'info');
    }

    // 刪除單個報名
    deleteRegistration(id) {
        this.registrations = this.registrations.filter(reg => reg.id !== id);
        this.saveData();
        this.updateUI();
        this.showNotification('報名已刪除', 'info');
    }

    // 更新UI
    updateUI() {
        this.updateAmountStats();
        this.updateRegistrationList();
        this.updateAdminStats();
        this.updateAdminRegistrationList();
    }

    // 更新金額統計
    updateAmountStats() {
        const amounts = ['30/10', '60/20', '100/20', '200/50'];
        
        amounts.forEach(amount => {
            const count = this.registrations.filter(reg => 
                reg.status === 'waiting' && reg.amount === amount
            ).length;
            const element = document.getElementById(`count-${amount.replace('/', '-')}`);
            if (element) {
                element.textContent = `${count}人`;
            }
        });
    }

    // 更新玩家報名列表
    updateRegistrationList() {
        const listContainer = document.getElementById('registrationList');
        const waitingRegistrations = this.registrations.filter(reg => reg.status === 'waiting');

        if (waitingRegistrations.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888;">目前無人報名</p>';
            return;
        }

        listContainer.innerHTML = waitingRegistrations.map(reg => {
            const isCurrentUser = this.currentUser && reg.nickname === this.currentUser.displayName;
            const timeRange = reg.earliestTime && reg.latestTime ? 
                `${reg.earliestTime} ~ ${reg.latestTime}` : '未設定';
            
            return `
                <div class="registration-item">
                    <div class="registration-info">
                        <div class="registration-name">${reg.nickname}</div>
                        <div class="registration-amount">$${reg.amount}</div>
                        <div class="registration-time">${this.formatTime(reg.timestamp)}</div>
                        <div class="registration-preferred-time">🕐 ${timeRange}</div>
                    </div>
                    <span class="table-status waiting">等待中</span>
                    ${isCurrentUser ? `
                        <div class="user-actions">
                            <button onclick="window.registrationSystem.cancelRegistration(${reg.id})" class="action-btn cancel-btn">取消報名</button>
                            <button onclick="window.registrationSystem.changeRegistrationAmount(${reg.id})" class="action-btn change-btn">更改金額</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // 更新管理後台統計
    updateAdminStats() {
        const totalCount = document.getElementById('totalCount');
        const pendingCount = document.getElementById('pendingCount');

        totalCount.textContent = this.registrations.length;
        pendingCount.textContent = this.registrations.filter(reg => reg.status === 'waiting').length;
    }

    // 更新管理後台報名列表
    updateAdminRegistrationList() {
        const listContainer = document.getElementById('adminRegistrationList');

        if (this.registrations.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888;">目前無報名記錄</p>';
            return;
        }

        listContainer.innerHTML = this.registrations.map(reg => {
            const statusClass = reg.status === 'waiting' ? 'waiting' : 
                              reg.status === 'playing' ? 'playing' : 'completed';
            const statusText = reg.status === 'waiting' ? '等待中' : 
                             reg.status === 'playing' ? '遊戲中' : '已完成';

            return `
                <div class="admin-registration-item">
                    <div class="admin-registration-info">
                        <div class="registration-name">${reg.nickname}</div>
                        <div class="registration-amount">$${reg.amount}</div>
                        <div class="registration-time">${this.formatTime(reg.timestamp)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="table-status ${statusClass}">${statusText}</span>
                        <div class="admin-registration-actions">
                            <button class="action-btn delete" onclick="window.registrationSystem.deleteRegistration(${reg.id})">
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // LINE Notify 設定
    showLineNotifySettings() {
        const token = prompt('請輸入 LINE Notify Token：', this.lineNotifyToken);
        
        if (token !== null) {
            this.lineNotifyToken = token;
            localStorage.setItem('lineNotifyToken', token);
            
            if (token) {
                this.showNotification('LINE Notify Token 已儲存', 'success');
                // 測試發送通知
                this.sendLineNotify('LINE Notify 設定成功！');
            } else {
                this.showNotification('LINE Notify Token 已清除', 'info');
            }
        }
    }

    // 發送 LINE Notify 通知
    async sendLineNotify(message) {
        if (!this.lineNotifyToken) {
            return; // 沒有設定 token 就不發送
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

            if (!response.ok) {
                console.error('LINE Notify 發送失敗:', response.statusText);
            }
        } catch (error) {
            console.error('LINE Notify 發送錯誤:', error);
        }
    }

    // 顯示通知
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // 格式化時間
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return '剛剛';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} 分鐘前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} 小時前`;
        } else {
            return date.toLocaleDateString('zh-TW');
        }
    }
}

// 初始化系統
let registrationSystem;

// 頁面載入完成後初始化
window.addEventListener('DOMContentLoaded', function() {
    registrationSystem = new RegistrationSystem();
    // 將系統物件設為全域變數，供按鈕事件使用
    window.registrationSystem = registrationSystem;
    registrationSystem.init();
});

// 定期更新UI（每30秒）
setInterval(() => {
    if (registrationSystem) {
        registrationSystem.updateUI();
    }
}, 30000);
