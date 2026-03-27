// 智能配對系統
class MahjongRegistrationSystem {
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
        const nickname = document.getElementById('nickname').value.trim();
        const amount = document.querySelector('input[name="amount"]:checked');

        if (!nickname) {
            this.showNotification('請輸入暱稱', 'error');
            return;
        }

        if (!amount) {
            this.showNotification('請選擇金額', 'error');
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
            amount: parseInt(amount.value),
            timestamp: new Date().toISOString(),
            status: 'waiting'
        };

        this.registrations.push(registration);
        this.saveData();
        this.updateUI();

        // 清空表單
        document.getElementById('registrationForm').reset();
        
        this.showNotification(`報名成功！${nickname} 已報名 $${amount.value}`, 'success');
        
        // 發送 LINE Notify 通知（如果已設定）
        this.sendLineNotify(`新報名：${nickname} 報名 $${amount.value}`);
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
        this.updateRegistrationList();
        this.updateAdminStats();
        this.updateAdminRegistrationList();
    }

    // 更新玩家報名列表
    updateRegistrationList() {
        const listContainer = document.getElementById('registrationList');
        const waitingRegistrations = this.registrations.filter(reg => reg.status === 'waiting');

        if (waitingRegistrations.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888;">目前無人報名</p>';
            return;
        }

        listContainer.innerHTML = waitingRegistrations.map(reg => `
            <div class="registration-item">
                <div class="registration-info">
                    <div class="registration-name">${reg.nickname}</div>
                    <div class="registration-amount">$${reg.amount}</div>
                    <div class="registration-time">${this.formatTime(reg.timestamp)}</div>
                </div>
                <span class="table-status waiting">等待中</span>
            </div>
        `).join('');
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
                            <button class="action-btn delete" onclick="mahjongSystem.deleteRegistration(${reg.id})">
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
let mahjongSystem;
document.addEventListener('DOMContentLoaded', () => {
    mahjongSystem = new MahjongRegistrationSystem();
});

// 定期更新UI（每30秒）
setInterval(() => {
    if (mahjongSystem) {
        mahjongSystem.updateUI();
    }
}, 30000);
