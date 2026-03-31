// 前台顯示系統 - 僅供查看
class FrontendSystem {
    constructor() {
        this.registrations = [];
        this.tables = [];
        this.currentUser = null;
        this.isLoggedIn = false;
        this.init();
    }

    async init() {
        // 檢查登入狀態
        await this.checkLoginStatus();
        
        // 如果未登入，顯示登入提示但不強制跳轉
        if (!this.isLoggedIn) {
            this.showLoginPrompt();
            // 不立即跳轉，讓用戶可以選擇登入
        }
        
        // 無論是否登入都初始化基本系統
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
        this.startAutoRefresh();
        this.startClock();
        this.startWaitingTimer();
        this.startAutoSync();
    }
    
    // 檢查登入狀態
    async checkLoginStatus() {
        try {
            // 檢查 localStorage 中的用戶資訊
            const userInfo = localStorage.getItem('lineUserInfo');
            const loginMethod = localStorage.getItem('loginMethod');
            
            if (userInfo && loginMethod === 'line') {
                const user = JSON.parse(userInfo);
                
                // 驗證用戶資料完整性
                if (user.userId && user.displayName) {
                    this.currentUser = user;
                    this.isLoggedIn = true;
                    console.log('用戶已登入:', user.displayName);
                    return;
                }
            }
            
            // 檢查 URL 參數中的授權碼（從 LINE 登入回來）
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (code && state) {
                await this.handleLineCallback(code, state);
                return;
            }
            
            // 未登入狀態
            this.isLoggedIn = false;
            console.log('用戶未登入');
            
        } catch (error) {
            console.error('檢查登入狀態時發生錯誤:', error);
            this.isLoggedIn = false;
        }
    }
    
    // 處理 LINE 登入回調
    async handleLineCallback(code, state) {
        try {
            // 顯示載入畫面
            this.showLoadingScreen();
            
            // 獲取 access token
            const tokenResponse = await fetch('/api/line/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, state })
            });
            
            if (!tokenResponse.ok) {
                throw new Error('獲取 token 失敗');
            }
            
            const tokenData = await tokenResponse.json();
            
            // 獲取用戶資料
            const profileResponse = await fetch('https://api.line.me/v2/profile', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                }
            });
            
            if (!profileResponse.ok) {
                throw new Error('獲取用戶資料失敗');
            }
            
            const profileData = await profileResponse.json();
            
            // 保存用戶資料
            this.currentUser = {
                userId: profileData.userId,
                displayName: profileData.displayName,
                pictureUrl: profileData.pictureUrl,
                statusMessage: profileData.statusMessage || ''
            };
            
            localStorage.setItem('lineUserInfo', JSON.stringify(this.currentUser));
            localStorage.setItem('loginMethod', 'line');
            
            this.isLoggedIn = true;
            
            // 清理 URL 參數
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // 初始化系統
            this.loadData();
            this.loadUserInfo();
            this.setupEventListeners();
            this.updateUI();
            this.startAutoRefresh();
            this.startClock();
            this.startWaitingTimer();
            this.startAutoSync();
            
        } catch (error) {
            console.error('處理 LINE 登入回調時發生錯誤:', error);
            this.redirectToLogin();
        }
    }
    
    // 跳轉到登入頁面
    redirectToLogin() {
        const loginUrl = 'line-login.html';
        window.location.href = loginUrl;
    }
    
    // 顯示載入畫面
    showLoadingScreen() {
        document.body.innerHTML = `
            <div class="loading-screen">
                <div class="loading-container">
                    <div class="neon-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">正在登入中...</div>
                    </div>
                </div>
            </div>
        `;
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
        if (loginPrompt) {
            loginPrompt.style.display = 'block';
            // 添加登入按鈕事件
            const loginBtn = loginPrompt.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.onclick = () => {
                    window.location.href = 'line-login.html';
                };
            }
        }
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
        this.updateRoomListWithAnimation(); // 使用帶動畫的房間列表更新
        this.updateUserInfo();
        this.checkAutoTrigger();
        this.checkBroadcastMessage(); // 檢查廣播訊息
        this.updateLiveStats(); // 更新即時統計
    }

    // 添加事件到跑馬燈
    addEventToTicker(event) {
        const tickerContent = document.getElementById('eventTickerContent');
        if (tickerContent) {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            const eventHtml = `<span class="event-text">🎯 ${timeString}，${event}</span>`;
            
            // 添加到現有內容
            tickerContent.innerHTML += eventHtml;
            
            // 限制最多 5 個事件
            const events = tickerContent.querySelectorAll('.event-text');
            if (events.length > 5) {
                events[0].remove();
            }
        }
    }
    
    // 更新房間列表時添加數字跳動效果
    updateRoomListWithAnimation() {
        const roomListContainer = document.getElementById('roomList');
        if (!roomListContainer) return;
        
        if (typeof mockAPI !== 'undefined') {
            const rooms = mockAPI.getRooms();
            
            if (rooms.length === 0) {
                roomListContainer.innerHTML = '<div class="empty-rooms"><p>🎲 目前沒有開設的房間</p></div>';
                return;
            }
            
            roomListContainer.innerHTML = rooms.map(room => {
                const isNearComplete = room.currentPlayers === 3;
                const isFull = room.currentPlayers === room.maxPlayers;
                const isPlaying = room.status === 'playing';
                
                return `
                    <div class="room-item ${isNearComplete ? 'near-complete' : ''} ${isFull ? 'full' : ''} ${isPlaying ? 'playing' : ''}">
                        <div class="room-left">
                            <div class="room-title">${room.roomTitle}</div>
                            <div class="room-score">${room.score}</div>
                        </div>
                        
                        <div class="room-center">
                            <div class="room-time">
                                <span class="time-label">開打時間:</span>
                                <span class="time-value">${room.startTime === '滿開' ? '🎯 湊滿 4 人即刻開打' : room.startTime}</span>
                            </div>
                            <div class="room-players">
                                ${room.players.map(player => {
                                    const isCurrentUser = this.currentUser && player.nickname === this.currentUser.displayName;
                                    const isBlacklisted = this.isPlayerBlacklisted(player.nickname);
                                    const playerRating = this.getPlayerRating(player.nickname);
                                    const playerBadge = this.getPlayerBadge(player.nickname);
                                    
                                    return `
                                        <div class="player-avatar ${isCurrentUser ? 'current-user' : ''} ${isBlacklisted ? 'blacklisted' : ''} haptic-feedback">
                                            ${player.avatar ? 
                                                `<img src="${player.avatar}" alt="${player.nickname}">` : 
                                                `<div class="avatar-placeholder">${player.nickname[0]}</div>`
                                            }
                                            <div class="player-rating-dot rating-${playerRating}"></div>
                                            ${isBlacklisted ? '<div class="blacklist-warning">⚠️</div>' : ''}
                                            ${playerBadge ? `<div class="player-badge ${playerBadge.type}">${playerBadge.emoji}</div>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                                ${Array(room.maxPlayers - room.players.length).fill(0).map(() => 
                                    '<div class="player-avatar empty"><div class="avatar-placeholder">?</div></div>'
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="room-right">
                            <div class="room-status">
                                ${isPlaying ? 
                                    '<span class="status-badge playing">🎮 遊戲中</span>' :
                                    isFull ? 
                                    '<span class="status-badge full">👥 已滿</span>' :
                                    isNearComplete ?
                                    '<span class="status-badge near-complete player-number-change">🔴 3 缺 1</span>' :
                                    `<span class="status-badge waiting player-number-change">👋 <span class="player-count">${room.currentPlayers}</span>/4</span>`
                                }
                            </div>
                            ${this.currentUser && !isFull && !isPlaying ? 
                                `<button class="join-room-btn haptic-feedback" onclick="window.frontendSystem.joinRoom(${room.id})">加入房間</button>` :
                                ''
                            }
                        </div>
                    </div>
                `;
            }).join('');
            
            // 添加觸覺回饋到所有按鈕
            this.addHapticFeedback();
        }
        
        // 更新統計資訊
        this.updateRoomStats();
    }
    
    // 添加觸覺回饋
    addHapticFeedback() {
        const buttons = document.querySelectorAll('.join-room-btn, .nav-btn, .admin-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                this.triggerHapticFeedback();
            });
        });
    }
    
    // 獲取玩家勳章
    getPlayerBadge(playerName) {
        const playerBadges = JSON.parse(localStorage.getItem('playerBadges') || '{}');
        const badges = playerBadges[playerName];
        return badges && badges.length > 0 ? badges[badges.length - 1] : null;
    }
    updateRoomList() {
        const roomListContainer = document.getElementById('roomList');
        if (!roomListContainer) return;
        
        if (typeof mockAPI !== 'undefined') {
            const rooms = mockAPI.getRooms();
            
            if (rooms.length === 0) {
                roomListContainer.innerHTML = '<div class="empty-rooms"><p>🎲 目前沒有開設的房間</p></div>';
                return;
            }
            
            roomListContainer.innerHTML = rooms.map(room => {
                const isNearComplete = room.currentPlayers === 3;
                const isFull = room.currentPlayers === room.maxPlayers;
                const isPlaying = room.status === 'playing';
                
                return `
                    <div class="room-item ${isNearComplete ? 'near-complete' : ''} ${isFull ? 'full' : ''} ${isPlaying ? 'playing' : ''}">
                        <div class="room-left">
                            <div class="room-title">${room.roomTitle}</div>
                            <div class="room-score">${room.score}</div>
                        </div>
                        
                        <div class="room-center">
                            <div class="room-time">
                                <span class="time-label">開打時間:</span>
                                <span class="time-value">${room.startTime === '滿開' ? '🎯 湊滿 4 人即刻開打' : room.startTime}</span>
                            </div>
                            <div class="room-players">
                                ${room.players.map(player => {
                                    const isCurrentUser = this.currentUser && player.nickname === this.currentUser.displayName;
                                    const isBlacklisted = this.isPlayerBlacklisted(player.nickname);
                                    const playerRating = this.getPlayerRating(player.nickname);
                                    
                                    return `
                                        <div class="player-avatar ${isCurrentUser ? 'current-user' : ''} ${isBlacklisted ? 'blacklisted' : ''}">
                                            ${player.avatar ? 
                                                `<img src="${player.avatar}" alt="${player.nickname}">` : 
                                                `<div class="avatar-placeholder">${player.nickname[0]}</div>`
                                            }
                                            <div class="player-rating-dot rating-${playerRating}"></div>
                                            ${isBlacklisted ? '<div class="blacklist-warning">⚠️</div>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                                ${Array(room.maxPlayers - room.players.length).fill(0).map(() => 
                                    '<div class="player-avatar empty"><div class="avatar-placeholder">?</div></div>'
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="room-right">
                            <div class="room-status">
                                ${isPlaying ? 
                                    '<span class="status-badge playing">🎮 遊戲中</span>' :
                                    isFull ? 
                                    '<span class="status-badge full">👥 已滿</span>' :
                                    isNearComplete ?
                                    '<span class="status-badge near-complete">🔴 3 缺 1</span>' :
                                    `<span class="status-badge waiting">👋 ${room.currentPlayers}/4</span>`
                                }
                            </div>
                            ${this.currentUser && !isFull && !isPlaying ? 
                                `<button class="join-room-btn" onclick="window.frontendSystem.joinRoom(${room.id})">加入房間</button>` :
                                ''
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // 更新統計資訊
        this.updateRoomStats();
    }
    
    // 檢查廣播訊息
    checkBroadcastMessage() {
        const broadcastData = localStorage.getItem('broadcastMessage');
        if (broadcastData) {
            const data = JSON.parse(broadcastData);
            const now = Date.now();
            
            // 顯示 30 秒內的廣播
            if (now - data.timestamp < 30000) {
                this.showNeonTicker(data.message);
            }
            
            // 清理過期廣播
            localStorage.removeItem('broadcastMessage');
        }
    }
    
    // 顯示霓虹燈跑馬燈
    showNeonTicker(message) {
        const tickerContent = document.getElementById('tickerContent');
        if (tickerContent) {
            tickerContent.innerHTML = `<span class="ticker-text">📡 ${message}</span>`;
            const ticker = document.getElementById('neonTicker');
            ticker.style.display = 'block';
            
            // 30 秒後隱藏
            setTimeout(() => {
                ticker.style.display = 'none';
            }, 30000);
        }
    }
    
    // 更新即時統計
    updateLiveStats() {
        if (typeof mockAPI !== 'undefined') {
            const rooms = mockAPI.getRooms();
            
            // 計算在線人數
            let onlineCount = 0;
            rooms.forEach(room => {
                onlineCount += room.players.length;
            });
            
            // 計算今日開桌數
            const todayTables = rooms.filter(room => room.status === 'playing').length;
            
            // 計算熱度指數
            const heatIndex = Math.min(99, Math.floor((onlineCount / 12) * 100));
            
            // 更新顯示
            const onlineCountEl = document.getElementById('onlineCount');
            const todayTablesEl = document.getElementById('todayTables');
            const heatIndexEl = document.getElementById('heatIndex');
            
            if (onlineCountEl) {
                const oldValue = parseInt(onlineCountEl.textContent);
                onlineCountEl.textContent = onlineCount;
                
                // 數字變動時添加跳動效果
                if (oldValue !== onlineCount) {
                    onlineCountEl.classList.add('player-count-change');
                    setTimeout(() => {
                        onlineCountEl.classList.remove('player-count-change');
                    }, 500);
                }
            }
            
            if (todayTablesEl) todayTablesEl.textContent = todayTables;
            if (heatIndexEl) heatIndexEl.textContent = heatIndex;
        }
    }
    updateRoomStats() {
        if (typeof mockAPI !== 'undefined') {
            const rooms = mockAPI.getRooms();
            const totalRooms = rooms.length;
            const waitingRooms = rooms.filter(room => room.status === 'waiting').length;
            const playingRooms = rooms.filter(room => room.status === 'playing').length;
            
            const totalRoomsEl = document.getElementById('totalRooms');
            const waitingRoomsEl = document.getElementById('waitingRooms');
            const playingRoomsEl = document.getElementById('playingRooms');
            
            if (totalRoomsEl) totalRoomsEl.textContent = totalRooms;
            if (waitingRoomsEl) waitingRoomsEl.textContent = waitingRooms;
            if (playingRoomsEl) playingRoomsEl.textContent = playingRooms;
        }
    }
    
    // 加入房間
    async joinRoom(roomId) {
        if (!this.currentUser) {
            this.showNotification('請先登入 LINE', 'error');
            return;
        }
        
        if (typeof mockAPI !== 'undefined') {
            const playerData = {
                id: this.currentUser.userId || this.currentUser.displayName,
                nickname: this.currentUser.displayName,
                avatar: this.currentUser.pictureUrl
            };
            
            const result = await mockAPI.joinRoom(roomId, playerData);
            
            if (result.success) {
                this.showNotification('成功加入房間！', 'success');
                this.updateRoomList();
            } else {
                this.showNotification(result.message, 'error');
            }
        }
    }
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
        
        // 檢查自動觸發標記
        this.checkAutoTrigger();
        
        // 更新候補計時清單
        this.updateWaitingTimerList();
    }

    // 啟動自動同步（每 10 秒從後端抓取最新資料）
    startAutoSync() {
        setInterval(async () => {
            try {
                await this.syncDataFromBackend();
            } catch (error) {
                console.error('自動同步失敗:', error);
            }
        }, 10000); // 每 10 秒同步一次
    }

    // 從後端同步資料
    async syncDataFromBackend() {
        // 模擬從後端 API 獲取最新資料
        if (typeof mockAPI !== 'undefined') {
            // 獲取最新報名資料
            const latestRegistrations = mockAPI.getRegistrations();
            const latestTables = mockAPI.loadTables();
            
            // 檢查是否有變化
            const hasChanges = this.hasDataChanged(this.registrations, latestRegistrations) ||
                            this.hasDataChanged(this.tables, latestTables);
            
            if (hasChanges) {
                // 更新本地資料
                this.registrations = latestRegistrations;
                this.tables = latestTables;
                
                // 重新渲染 UI
                this.updateUI();
                
                console.log('資料已同步:', new Date().toLocaleTimeString('zh-TW'));
            }
        }
    }

    // 檢查資料是否有變化
    hasDataChanged(oldData, newData) {
        if (oldData.length !== newData.length) {
            return true;
        }
        
        // 簡單比較時間戳記
        const oldTimestamps = oldData.map(item => item.timestamp || '').sort().join(',');
        const newTimestamps = newData.map(item => item.timestamp || '').sort().join(',');
        
        return oldTimestamps !== newTimestamps;
    }

    // 檢查自動觸發標記
    checkAutoTrigger() {
        const trigger = localStorage.getItem('nearCompleteTrigger');
        if (trigger) {
            const data = JSON.parse(trigger);
            const now = Date.now();
            
            // 檢查是否在 5 秒內
            if (now - data.timestamp < 5000) {
                // 強制顯示 3 缺 1 提示
                this.forceShowNearCompleteAlert(data.amount);
            }
        }
    }

    // 強制顯示 3 缺 1 提示
    forceShowNearCompleteAlert(amount) {
        const alertElement = document.getElementById('nearCompleteAlert');
        if (alertElement) {
            alertElement.style.display = 'block';
            
            // 更新提示內容
            const alertText = alertElement.querySelector('.alert-text p');
            if (alertText) {
                alertText.textContent = `$${amount} 桌次狀態更新！目前 3 缺 1，想打的快來報名！`;
            }
            
            // 5 秒後隱藏
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
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
