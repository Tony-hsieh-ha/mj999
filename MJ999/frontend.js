// 前台顯示系統 - 僅供查看
class FrontendSystem {
    constructor() {
        this.registrations = [];
        this.tables = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadData();
        this.loadUserInfo();
        this.setupEventListeners();
        this.updateUI();
        this.startAutoRefresh();
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
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (this.currentUser && userProfile) {
            userProfile.style.display = 'block';
            loginPrompt.style.display = 'none';
            registrationForm.style.display = 'block';
            
            if (userName) userName.textContent = this.currentUser.displayName;
            if (userAvatar) userAvatar.src = this.currentUser.pictureUrl;
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

    // 事件監聽器設置
    setupEventListeners() {
        // 導航按鈕
        document.getElementById('playerView').addEventListener('click', () => {
            this.showSection('player');
        });

        document.getElementById('statsView').addEventListener('click', () => {
            this.showSection('stats');
        });

        // 登出按鈕
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // 初始化時間選項 (僅供顯示)
        this.initializeTimeOptions();
    }

    // 初始化時間選項 (僅供顯示)
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
        timeOptions.forEach((time) => {
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

    // 頁面切換
    showSection(section) {
        const playerSection = document.getElementById('playerSection');
        const statsSection = document.getElementById('statsSection');
        const playerView = document.getElementById('playerView');
        const statsView = document.getElementById('statsView');

        // 隱藏所有區域
        playerSection.classList.remove('active');
        statsSection.classList.remove('active');
        playerView.classList.remove('active');
        statsView.classList.remove('active');

        // 顯示選定區域
        if (section === 'player') {
            playerSection.classList.add('active');
            playerView.classList.add('active');
        } else if (section === 'stats') {
            statsSection.classList.add('active');
            statsView.classList.add('active');
            this.updateStatsChart();
        }

        this.updateUI();
    }

    // 更新UI
    updateUI() {
        this.updateAmountStats();
        this.updateRegistrationList();
        this.updateStatsInfo();
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

    // 更新報名列表
    updateRegistrationList() {
        const listContainer = document.getElementById('registrationList');
        if (!listContainer) return;
        
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
                        <div class="user-status">
                            <span style="color: #ffd700; font-size: 0.9rem;">👤 您的報名</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // 更新統計資訊
    updateStatsInfo() {
        const totalCount = document.getElementById('totalCount');
        const pendingCount = document.getElementById('pendingCount');
        const matchedCount = document.getElementById('matchedCount');
        const playingCount = document.getElementById('playingCount');

        if (totalCount) totalCount.textContent = this.registrations.length;
        if (pendingCount) pendingCount.textContent = this.registrations.filter(reg => reg.status === 'waiting').length;
        if (matchedCount) matchedCount.textContent = this.registrations.filter(reg => reg.status === 'matched').length;
        if (playingCount) playingCount.textContent = this.registrations.filter(reg => reg.status === 'playing').length;
    }

    // 更新統計圖表
    updateStatsChart() {
        const chartContainer = document.getElementById('amountChart');
        if (!chartContainer) return;

        const amountCounts = {};
        this.registrations.forEach(reg => {
            amountCounts[reg.amount] = (amountCounts[reg.amount] || 0) + 1;
        });

        const total = this.registrations.length;
        const chartHTML = Object.entries(amountCounts).map(([amount, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return `
                <div class="chart-item">
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="chart-label">${amount}: ${count}人 (${percentage}%)</div>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = chartHTML || '<p style="text-align: center; color: #888;">暫無資料</p>';
    }

    // 自動刷新
    startAutoRefresh() {
        // 每30秒自動刷新資料
        setInterval(() => {
            this.loadData();
            this.updateUI();
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
}

// 初始化前台系統
let frontendSystem;

// 頁面載入完成後初始化
window.addEventListener('DOMContentLoaded', function() {
    frontendSystem = new FrontendSystem();
});
