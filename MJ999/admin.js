// 管理後台系統
class AdminSystem {
    constructor() {
        this.registrations = [];
        this.tables = [];
        this.lineNotifyToken = localStorage.getItem('lineNotifyToken') || '';
        this.isAdmin = false;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.startAutoRefresh();
    }

    // 身分驗證檢查
    checkAuthStatus() {
        const authSession = localStorage.getItem('adminSession');
        const sessionExpiry = localStorage.getItem('adminSessionExpiry');
        
        if (authSession && sessionExpiry && Date.now() < parseInt(sessionExpiry)) {
            this.isAdmin = true;
            this.showAdminInterface();
        } else {
            this.showLoginModal();
        }
    }

    // 顯示登入對話框
    showLoginModal() {
        const modal = document.getElementById('adminLoginModal');
        const adminMain = document.getElementById('adminMain');
        
        if (modal) modal.style.display = 'flex';
        if (adminMain) adminMain.style.display = 'none';
    }

    // 顯示管理介面
    showAdminInterface() {
        const modal = document.getElementById('adminLoginModal');
        const adminMain = document.getElementById('adminMain');
        
        if (modal) modal.style.display = 'none';
        if (adminMain) adminMain.style.display = 'block';
    }

    // 管理員登入
    async adminLogin() {
        const password = document.getElementById('adminPassword').value;
        const loginError = document.getElementById('loginError');
        
        try {
            // 使用環境變數或預設密碼
            const correctPassword = await this.getAdminPassword();
            
            if (password === correctPassword) {
                // 建立會話
                const sessionExpiry = Date.now() + (this.settings.sessionTimeout * 60 * 1000);
                localStorage.setItem('adminSession', 'authenticated');
                localStorage.setItem('adminSessionExpiry', sessionExpiry.toString());
                
                this.isAdmin = true;
                this.showAdminInterface();
                this.showNotification('登入成功', 'success');
                this.logActivity('管理員登入', 'success');
            } else {
                if (loginError) loginError.style.display = 'block';
                this.logActivity('管理員登入失敗', 'error');
            }
        } catch (error) {
            console.error('登入錯誤:', error);
            this.showNotification('登入失敗，請重試', 'error');
        }
    }

    // 獲取管理員密碼
    async getAdminPassword() {
        // 在實際環境中，這裡會從環境變數獲取
        // 目前使用預設密碼或從 localStorage 獲取
        return process?.env?.ADMIN_PASSWORD || localStorage.getItem('adminPassword') || 'admin123';
    }

    // 登出
    adminLogout() {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminSessionExpiry');
        this.isAdmin = false;
        this.showLoginModal();
        this.showNotification('已登出', 'info');
        this.logActivity('管理員登出', 'info');
    }

    // 事件監聽器設置
    setupEventListeners() {
        // 登入相關
        const loginBtn = document.getElementById('adminLoginBtn');
        const cancelLoginBtn = document.getElementById('cancelLoginBtn');
        const passwordInput = document.getElementById('adminPassword');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.adminLogin());
        }
        
        if (cancelLoginBtn) {
            cancelLoginBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.adminLogin();
                }
            });
        }

        // 導航按鈕
        this.setupNavigationListeners();

        // 快速操作按鈕
        document.getElementById('createTable').addEventListener('click', () => {
            this.createTable();
        });

        document.getElementById('clearTable').addEventListener('click', () => {
            this.clearTable();
        });

        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('確定要清空所有報名嗎？')) {
                this.clearAllRegistrations();
            }
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadData();
            this.updateUI();
            this.showNotification('資料已刷新', 'success');
        });

        // 報名管理按鈕
        document.getElementById('bulkDelete').addEventListener('click', () => {
            this.bulkDelete();
        });

        document.getElementById('bulkMatch').addEventListener('click', () => {
            this.bulkMatch();
        });

        // 設定相關按鈕
        document.getElementById('testLineNotify').addEventListener('click', () => {
            this.testLineNotify();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            if (confirm('確定要重置所有設定嗎？')) {
                this.resetSettings();
            }
        });

        document.getElementById('changePassword').addEventListener('click', () => {
            this.changeAdminPassword();
        });

        // 黑名單管理
        document.getElementById('addToBlacklist').addEventListener('click', () => {
            this.addToBlacklist();
        });

        // 戰力分級設定
        document.getElementById('setPlayerRating').addEventListener('click', () => {
            this.setPlayerRating();
        });
        document.getElementById('autoLineNotify').addEventListener('change', (e) => {
            this.settings.autoLineNotify = e.target.checked;
            this.saveSettings();
        });

        // 篩選器
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.updateRegistrationsTable();
        });

        document.getElementById('amountFilter').addEventListener('change', () => {
            this.updateRegistrationsTable();
        });

        // 全選
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#registrationsTableBody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }

    // 頁面切換
    showSection(section) {
        const sections = ['dashboard', 'registrations', 'settings'];
        const buttons = ['dashboardView', 'registrationsView', 'settingsView'];
        
        sections.forEach(sec => {
            const element = document.getElementById(`${sec}Section`);
            const button = document.getElementById(`${sec}View`);
            
            if (element) element.classList.remove('active');
            if (button) button.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${section}Section`);
        const activeButton = document.getElementById(`${section}View`);
        
        if (activeSection) activeSection.classList.add('active');
        if (activeButton) activeButton.classList.add('active');
    }

    // 管理功能
    clearAllRegistrations() {
        this.registrations = [];
        this.tables = [];
        this.saveData();
        this.updateUI();
        this.showNotification('所有報名已清空', 'info');
        this.logActivity('清空所有報名', 'info');
    }

    // 導航按鈕
    setupNavigationListeners() {
        document.getElementById('dashboardView').addEventListener('click', () => {
            this.showSection('dashboard');
        });

        document.getElementById('registrationsView').addEventListener('click', () => {
            this.showSection('registrations');
        });

        document.getElementById('settingsView').addEventListener('click', () => {
            this.showSection('settings');
        });
    }

    bulkDelete() {
        const checkboxes = document.querySelectorAll('#registrationsTableBody input[type="checkbox"]:checked');
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        if (ids.length === 0) {
            this.showNotification('請選擇要刪除的項目', 'error');
            return;
        }

        if (confirm(`確定要刪除選中的 ${ids.length} 個報名嗎？`)) {
            this.registrations = this.registrations.filter(reg => !ids.includes(reg.id));
            this.saveData();
            this.updateUI();
            this.showNotification(`已刪除 ${ids.length} 個報名`, 'success');
            this.logActivity(`批量刪除：${ids.length} 個報名`, 'success');
            
            // 檢查是否需要發送差一人通知
            this.checkNearCompleteNotification();
        }
    }

    bulkMatch() {
        const checkboxes = document.querySelectorAll('#registrationsTableBody input[type="checkbox"]:checked');
        const selectedRegistrations = Array.from(checkboxes).map(cb => 
            this.registrations.find(reg => reg.id === parseInt(cb.value))
        ).filter(Boolean);

        if (selectedRegistrations.length < 4) {
            this.showNotification('需要至少選擇4人才能配對', 'error');
            return;
        }

        const tablePlayers = selectedRegistrations.slice(0, 4);
        const table = {
            id: Date.now(),
            players: tablePlayers,
            timestamp: new Date().toISOString(),
            status: 'playing'
        };

        // 更新狀態
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
        this.showNotification(`批量配對成功！玩家：${playerNames}`, 'success');
        this.logActivity(`批量配對：${playerNames}`, 'success');
    }

    exportData() {
        const data = {
            registrations: this.registrations,
            tables: this.tables,
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mj999-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('資料已匯出', 'success');
        this.logActivity('匯出資料', 'success');
    }

    // 設定管理
    loadSettings() {
        const saved = localStorage.getItem('adminSettings');
        const defaultSettings = {
            autoMatch: false,
            maxPlayers: 4,
            sessionTimeout: 60,
            autoLineNotify: true
        };
        
        this.settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        
        // 更新 UI 狀態
        this.updateSettingsUI();
    }

    // 更新設定 UI
    updateSettingsUI() {
        const autoMatch = document.getElementById('autoMatch');
        const maxPlayers = document.getElementById('maxPlayers');
        const sessionTimeout = document.getElementById('sessionTimeout');
        const autoLineNotify = document.getElementById('autoLineNotify');
        const lineNotifyToken = document.getElementById('lineNotifyToken');
        
        if (autoMatch) autoMatch.checked = this.settings.autoMatch;
        if (maxPlayers) maxPlayers.value = this.settings.maxPlayers;
        if (sessionTimeout) sessionTimeout.value = this.settings.sessionTimeout;
        if (autoLineNotify) autoLineNotify.checked = this.settings.autoLineNotify;
        if (lineNotifyToken) lineNotifyToken.value = this.lineNotifyToken || '';
    }

    // 黑名單管理
    addToBlacklist() {
        const playerName = document.getElementById('blacklistPlayer').value.trim();
        const reason = document.getElementById('blacklistReason').value;
        
        if (!playerName) {
            this.showNotification('請輸入玩家名稱', 'error');
            return;
        }
        
        if (typeof mockAPI !== 'undefined') {
            const success = mockAPI.addToBlacklist(playerName, reason);
            if (success) {
                this.showNotification(`已將 ${playerName} 加入黑名單`, 'success');
                this.logActivity(`加入黑名單：${playerName} (${reason})`, 'warning');
                document.getElementById('blacklistPlayer').value = '';
                this.updateBlacklistList();
            } else {
                this.showNotification(`${playerName} 已在黑名單中`, 'error');
            }
        }
    }

    // 更新黑名單清單
    updateBlacklistList() {
        const blacklistList = document.getElementById('blacklistList');
        if (!blacklistList) return;
        
        if (typeof mockAPI !== 'undefined') {
            const blacklist = mockAPI.blacklist;
            
            if (blacklist.length === 0) {
                blacklistList.innerHTML = '<p style="color: #888; text-align: center;">黑名單為空</p>';
                return;
            }
            
            blacklistList.innerHTML = blacklist.map(player => `
                <div class="blacklist-item">
                    <div class="blacklist-info">
                        <span class="blacklist-name">${player.name}</span>
                        <span class="blacklist-reason">${player.reason}</span>
                        <span class="blacklist-date">${new Date(player.timestamp).toLocaleDateString('zh-TW')}</span>
                    </div>
                    <button class="admin-btn danger small" onclick="window.adminSystem.removeFromBlacklist('${player.name}')">移除</button>
                </div>
            `).join('');
        }
    }

    // 從黑名單移除
    removeFromBlacklist(playerName) {
        if (confirm(`確定要將 ${playerName} 從黑名單移除嗎？`)) {
            if (typeof mockAPI !== 'undefined') {
                const success = mockAPI.removeFromBlacklist(playerName);
                if (success) {
                    this.showNotification(`已將 ${playerName} 從黑名單移除`, 'success');
                    this.logActivity(`移除黑名單：${playerName}`, 'success');
                    this.updateBlacklistList();
                }
            }
        }
    }

    // 設定玩家戰力分級
    setPlayerRating() {
        const playerName = document.getElementById('ratingPlayerName').value.trim();
        const rating = document.getElementById('playerRating').value;
        
        if (!playerName) {
            this.showNotification('請輸入玩家名稱', 'error');
            return;
        }
        
        if (typeof mockAPI !== 'undefined') {
            mockAPI.setPlayerRating(playerName, rating);
            this.showNotification(`已設定 ${playerName} 的戰力為 ${rating}`, 'success');
            this.logActivity(`設定戰力：${playerName} -> ${rating}`, 'success');
            document.getElementById('ratingPlayerName').value = '';
        }
    }
    clearTable() {
        if (confirm('確定要清空/結算所有桌子嗎？這將把所有遊戲中的桌子重設為空桌狀態。')) {
            // 將所有遊戲中的桌子重設為空桌
            this.registrations.forEach(reg => {
                if (reg.status === 'playing' || reg.status === 'matched') {
                    reg.status = 'waiting';
                    reg.timestamp = new Date().toISOString();
                }
            });
            
            // 清空桌子記錄
            this.tables = [];
            
            this.saveData();
            this.updateUI();
            this.showNotification('已清空/結算所有桌子', 'success');
            this.logActivity('一鍵清空/結算所有桌子', 'success');
            
            // 檢查是否需要發送差一人通知
            this.checkNearCompleteNotification();
        }
    }
    saveSettings() {
        const autoMatch = document.getElementById('autoMatch')?.checked;
        const maxPlayers = document.getElementById('maxPlayers')?.value;
        const sessionTimeout = document.getElementById('sessionTimeout')?.value;
        const autoLineNotify = document.getElementById('autoLineNotify')?.checked;
        const lineNotifyToken = document.getElementById('lineNotifyToken')?.value;

        this.settings = {
            autoMatch: autoMatch !== undefined ? autoMatch : this.settings.autoMatch,
            maxPlayers: maxPlayers ? parseInt(maxPlayers) : this.settings.maxPlayers,
            sessionTimeout: sessionTimeout ? parseInt(sessionTimeout) : this.settings.sessionTimeout,
            autoLineNotify: autoLineNotify !== undefined ? autoLineNotify : this.settings.autoLineNotify
        };

        localStorage.setItem('adminSettings', JSON.stringify(this.settings));
        
        if (lineNotifyToken) {
            this.lineNotifyToken = lineNotifyToken;
            localStorage.setItem('lineNotifyToken', lineNotifyToken);
        }

        this.showNotification('設定已儲存', 'success');
        this.logActivity('更新系統設定', 'success');
    }

    resetSettings() {
        localStorage.removeItem('adminSettings');
        this.settings = this.loadSettings();
        this.updateUI();
        this.showNotification('設定已重置', 'info');
        this.logActivity('重置系統設定', 'info');
    }

    changeAdminPassword() {
        const newPassword = prompt('請輸入新的管理員密碼：');
        if (newPassword && newPassword.length >= 6) {
            localStorage.setItem('adminPassword', newPassword);
            this.showNotification('密碼已更新', 'success');
            this.logActivity('變更管理員密碼', 'success');
        } else if (newPassword) {
            this.showNotification('密碼長度至少需要6個字元', 'error');
        }
    }

    // LINE Notify 功能
    testLineNotify() {
        const token = document.getElementById('lineNotifyToken').value;
        if (!token) {
            this.showNotification('請先輸入 LINE Notify Token', 'error');
            return;
        }

        fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${token}`
            },
            body: 'message=測試通知：管理後台測試成功'
        })
        .then(response => {
            if (response.ok) {
                this.showNotification('LINE Notify 測試成功', 'success');
            } else {
                this.showNotification('LINE Notify 測試失敗', 'error');
            }
        })
        .catch(error => {
            console.error('LINE Notify 測試錯誤:', error);
            this.showNotification('LINE Notify 測試失敗', 'error');
        });
    }

    sendLineNotify(message) {
        if (!this.lineNotifyToken) return;

        fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.lineNotifyToken}`
            },
            body: `message=${encodeURIComponent(message)}`
        }).catch(error => {
            console.error('LINE Notify 發送錯誤:', error);
        });
    }

    // 更新UI
    updateUI() {
        this.updateDashboardStats();
        this.updateRegistrationsTable();
        this.updateBlacklistList();
        this.updateSettingsUI();
        this.updateActivityLog();
    }

    updateDashboardStats() {
        const totalCount = document.getElementById('totalCount');
        const pendingCount = document.getElementById('pendingCount');
        const matchedCount = document.getElementById('matchedCount');
        const playingCount = document.getElementById('playingCount');

        if (totalCount) totalCount.textContent = this.registrations.length;
        if (pendingCount) pendingCount.textContent = this.registrations.filter(reg => reg.status === 'waiting').length;
        if (matchedCount) matchedCount.textContent = this.registrations.filter(reg => reg.status === 'matched').length;
        if (playingCount) playingCount.textContent = this.registrations.filter(reg => reg.status === 'playing').length;
    }

    updateRegistrationsTable() {
        const tbody = document.getElementById('registrationsTableBody');
        if (!tbody) return;

        const statusFilter = document.getElementById('statusFilter').value;
        const amountFilter = document.getElementById('amountFilter').value;

        let filteredRegistrations = this.registrations;

        if (statusFilter !== 'all') {
            filteredRegistrations = filteredRegistrations.filter(reg => reg.status === statusFilter);
        }

        if (amountFilter !== 'all') {
            filteredRegistrations = filteredRegistrations.filter(reg => reg.amount === amountFilter);
        }

        tbody.innerHTML = filteredRegistrations.map(reg => {
            const timeRange = reg.earliestTime && reg.latestTime ? 
                `${reg.earliestTime} ~ ${reg.latestTime}` : '未設定';
            
            const statusClass = reg.status;
            const statusText = {
                'waiting': '等待配對',
                'matched': '已配對',
                'playing': '配對中'
            }[reg.status] || reg.status;

            return `
                <tr>
                    <td><input type="checkbox" value="${reg.id}"></td>
                    <td>${reg.nickname}</td>
                    <td>$${reg.amount}</td>
                    <td>${timeRange}</td>
                    <td>${this.formatTime(reg.timestamp)}</td>
                    <td><span class="table-status ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="action-btn delete" onclick="adminSystem.deleteRegistration(${reg.id})">
                            刪除
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateActivityLog() {
        const logContainer = document.getElementById('activityLog');
        if (!logContainer) return;

        const activities = this.getActivityLog();
        logContainer.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                <span class="activity-message">${activity.message}</span>
            </div>
        `).join('');
    }

    deleteRegistration(id) {
        if (confirm('確定要刪除這筆報名嗎？')) {
            this.registrations = this.registrations.filter(reg => reg.id !== id);
            this.saveData();
            this.updateUI();
            this.showNotification('報名已刪除', 'info');
            this.logActivity(`刪除報名 ID: ${id}`, 'info');
            
            // 檢查是否需要發送差一人通知
            this.checkNearCompleteNotification();
        }
    }

    // 檢查是否需要發送差一人通知
    checkNearCompleteNotification() {
        // 檢查是否開啟自動通知
        if (!this.settings.autoLineNotify) {
            return;
        }
        
        // 使用 Mock API 檢查
        if (typeof mockAPI !== 'undefined') {
            mockAPI.checkAndNotifyNearComplete();
        }
    }

    // 活動日誌
    logActivity(message, type = 'info') {
        const activities = this.getActivityLog();
        activities.unshift({
            message,
            type,
            timestamp: new Date().toISOString()
        });
        
        // 只保留最近100筆記錄
        if (activities.length > 100) {
            activities.splice(100);
        }
        
        localStorage.setItem('adminActivityLog', JSON.stringify(activities));
    }

    getActivityLog() {
        const saved = localStorage.getItem('adminActivityLog');
        return saved ? JSON.parse(saved) : [];
    }

    // 自動刷新
    startAutoRefresh() {
        setInterval(() => {
            if (this.isAdmin) {
                this.loadData();
                this.updateUI();
            }
        }, 30000);
    }

    // 通知功能
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

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

    // 資料管理
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
}

// 初始化管理系統
let adminSystem;

// 頁面載入完成後初始化
window.addEventListener('DOMContentLoaded', function() {
    adminSystem = new AdminSystem();
});
