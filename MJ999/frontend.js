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
        this.startClock();
        this.startWaitingTimer();
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
            listContainer.innerHTML = '<p style="text-align: center; color: #888; font-size: 1.2rem;">目前無人報名</p>';
            return;
        }

        // 按金額分組
        const amountGroups = {};
        waitingRegistrations.forEach(reg => {
            if (!amountGroups[reg.amount]) {
                amountGroups[reg.amount] = [];
            }
            amountGroups[reg.amount].push(reg);
        });

        listContainer.innerHTML = Object.entries(amountGroups).map(([amount, players]) => {
            const isNearComplete = players.length === 3;
            const timeRanges = players.map(p => {
                return p.earliestTime && p.latestTime ? 
                    `${p.earliestTime} ~ ${p.latestTime}` : '未設定';
            });
            
            return `
                <div class="table-status-card ${isNearComplete ? 'near-complete' : ''}">
                    <div class="table-header">
                        <h4 class="table-amount">$${amount}</h4>
                        <span class="table-count">${players.length}/4 人</span>
                        ${isNearComplete ? '<span class="near-complete-badge">3 缺 1</span>' : ''}
                    </div>
                    <div class="players-list">
                        ${players.map(player => {
                            const isCurrentUser = this.currentUser && player.nickname === this.currentUser.displayName;
                            const isBlacklisted = this.isPlayerBlacklisted(player.nickname);
                            const playerRating = this.getPlayerRating(player.nickname);
                            
                            return `
                                <div class="player-item ${isCurrentUser ? 'current-user' : ''} ${isBlacklisted ? 'blacklisted' : ''}">
                                    <div class="player-avatar">
                                        ${isCurrentUser && this.currentUser?.pictureUrl ? 
                                            `<img src="${this.currentUser.pictureUrl}" alt="${player.nickname}">` : 
                                            `<div class="avatar-placeholder">${player.nickname[0]}</div>`
                                        }
                                        <div class="player-rating-dot rating-${playerRating}"></div>
                                    </div>
                                    <div class="player-info">
                                        <div class="player-name">
                                            ${player.nickname}
                                            ${isBlacklisted ? '<span class="blacklist-warning">⚠️ 黑名單</span>' : ''}
                                        </div>
                                        <div class="player-time">🕐 ${timeRanges[players.indexOf(player)]}</div>
                                        <div class="player-rating">戰力：${playerRating}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${isNearComplete ? '<div class="near-complete-indicator">🔴 紅色呼吸效果</div>' : ''}
                </div>
            `;
        }).join('');
        
        // 檢查是否需要顯示 3 缺 1 閃爍提示
        this.checkNearCompleteAlert();
        
        // 更新候補計時清單
        this.updateWaitingTimerList();
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

    // 啟動候補計時器
    startWaitingTimer() {
        setInterval(() => {
            this.updateWaitingTimerList();
        }, 60000); // 每分鐘更新一次
    }

    // 更新候補計時清單
    updateWaitingTimerList() {
        const timerList = document.getElementById('waitingTimerList');
        if (!timerList) return;
        
        const waitingRegistrations = this.registrations.filter(reg => reg.status === 'waiting');
        
        if (waitingRegistrations.length === 0) {
            timerList.innerHTML = '<p style="text-align: center; color: #888; font-size: 1.1rem;">目前無人等待</p>';
            return;
        }
        
        // 按等待時間排序
        const sortedPlayers = waitingRegistrations.map(player => {
            const waitMinutes = this.getWaitingMinutes(player.nickname);
            return {
                ...player,
                waitMinutes
            };
        }).sort((a, b) => b.waitMinutes - a.waitMinutes);
        
        timerList.innerHTML = sortedPlayers.map(player => {
            const waitMinutes = player.waitMinutes;
            const isOver30Minutes = waitMinutes >= 30;
            const playerRating = this.getPlayerRating(player.nickname);
            
            return `
                <div class="waiting-timer-item ${isOver30Minutes ? 'over-30-minutes' : ''}">
                    <div class="timer-info">
                        <div class="timer-name">
                            ${player.nickname}
                            <div class="timer-rating-dot rating-${playerRating}"></div>
                        </div>
                        <div class="timer-amount">$${player.amount}</div>
                    </div>
                    <div class="timer-time ${isOver30Minutes ? 'warning' : ''}">
                        <div class="timer-minutes">${waitMinutes}</div>
                        <div class="timer-unit">分鐘</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 獲取等待分鐘數
    getWaitingMinutes(playerName) {
        // 使用 Mock API 的候補計時系統
        if (typeof mockAPI !== 'undefined') {
            return mockAPI.getWaitingMinutes(playerName);
        }
        return 0;
    }

    // 檢查是否為黑名單玩家
    isPlayerBlacklisted(playerName) {
        if (typeof mockAPI !== 'undefined') {
            return mockAPI.isBlacklisted(playerName);
        }
        return false;
    }

    // 獲取玩家戰力分級
    getPlayerRating(playerName) {
        if (typeof mockAPI !== 'undefined') {
            return mockAPI.getPlayerRating(playerName);
        }
        return '新手';
    }
    checkNearCompleteAlert() {
        const alertElement = document.getElementById('nearCompleteAlert');
        if (!alertElement) return;
        
        const waitingRegistrations = this.registrations.filter(reg => reg.status === 'waiting');
        const amountGroups = {};
        
        waitingRegistrations.forEach(reg => {
            if (!amountGroups[reg.amount]) {
                amountGroups[reg.amount] = [];
            }
            amountGroups[reg.amount].push(reg);
        });
        
        // 檢查是否有 3 缺 1 的情況
        const hasNearComplete = Object.values(amountGroups).some(players => players.length === 3);
        
        if (hasNearComplete) {
            alertElement.style.display = 'block';
            
            // 5 秒後自動隱藏
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        } else {
            alertElement.style.display = 'none';
        }
    }
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const clockDisplay = document.getElementById('clockDisplay');
            
            if (clockDisplay) {
                const time = now.toLocaleTimeString('zh-TW', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                const date = now.toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                
                clockDisplay.innerHTML = `
                    <div class="time">${time}</div>
                    <div class="date">${date}</div>
                `;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
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
