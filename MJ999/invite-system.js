// 配對約局系統
class InviteSystem {
    constructor() {
        this.sessions = [];
        this.currentFilter = 'all';
        this.notificationSettings = {
            lineNotifyToken: localStorage.getItem('lineNotifyToken') || '',
            notifyNewSession: true,
            notifyJoin: true,
            notifyFull: true,
            notifyStart: true
        };
        this.init();
    }

    init() {
        this.loadData();
        this.loadUserInfo();
        this.setupEventListeners();
        this.updateUI();
        this.setDefaultDateTime();
        this.loadNotificationSettings();
        
        // 每分鐘檢查一次約局狀態
        setInterval(() => {
            this.checkSessionStatus();
        }, 60000);
        
        // 每30秒更新UI
        setInterval(() => {
            this.updateUI();
        }, 30000);
    }

    loadData() {
        const savedSessions = localStorage.getItem('mahjongSessions');
        if (savedSessions) {
            this.sessions = JSON.parse(savedSessions);
        }
    }

    saveData() {
        localStorage.setItem('mahjongSessions', JSON.stringify(this.sessions));
    }

    setupEventListeners() {
        document.getElementById('createSessionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSession();
        });

        // 登出按鈕
        const sessionLogoutBtn = document.getElementById('sessionLogoutBtn');
        if (sessionLogoutBtn) {
            sessionLogoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    // 用戶管理
    loadUserInfo() {
        const savedUserInfo = localStorage.getItem('lineUserInfo');
        if (savedUserInfo) {
            this.currentUser = JSON.parse(savedUserInfo);
            this.displaySessionUserProfile();
        } else {
            this.showSessionLoginPrompt();
        }
    }

    displaySessionUserProfile() {
        const userProfile = document.getElementById('sessionUserProfile');
        const loginPrompt = document.getElementById('sessionLoginPrompt');
        const createSessionForm = document.getElementById('createSessionForm');
        const hostNameGroup = document.getElementById('hostNameGroup');
        const hostNameInput = document.getElementById('hostName');
        const userAvatar = document.getElementById('sessionUserAvatar');
        const userName = document.getElementById('sessionUserName');

        if (this.currentUser && userProfile) {
            userProfile.style.display = 'block';
            loginPrompt.style.display = 'none';
            createSessionForm.style.display = 'block';
            
            // 顯示用戶資訊
            if (userAvatar) userAvatar.src = this.currentUser.pictureUrl;
            if (userName) userName.textContent = this.currentUser.displayName;
            
            // 自動填入主持人暱稱
            if (hostNameInput && this.currentUser.displayName) {
                hostNameInput.value = this.currentUser.displayName;
                // 如果是LINE用戶，隱藏暱稱輸入框
                if (this.currentUser.userId && !this.currentUser.userId.startsWith('manual_')) {
                    hostNameGroup.style.display = 'none';
                } else {
                    hostNameGroup.style.display = 'block';
                }
            }
        } else {
            this.showSessionLoginPrompt();
        }
    }

    showSessionLoginPrompt() {
        const userProfile = document.getElementById('sessionUserProfile');
        const loginPrompt = document.getElementById('sessionLoginPrompt');
        const createSessionForm = document.getElementById('createSessionForm');

        if (userProfile) userProfile.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (createSessionForm) createSessionForm.style.display = 'none';
    }

    logout() {
        localStorage.removeItem('lineUserInfo');
        localStorage.removeItem('loginMethod');
        this.currentUser = null;
        this.showSessionLoginPrompt();
        this.showNotification('已登出', 'info');
    }

    setDefaultDateTime() {
        const now = new Date();
        now.setHours(now.getHours() + 2); // 預設2小時後
        const dateTimeLocal = now.toISOString().slice(0, 16);
        document.getElementById('sessionTime').value = dateTimeLocal;
    }

    createSession() {
        const session = {
            id: Date.now(),
            hostName: document.getElementById('hostName').value.trim(),
            title: document.getElementById('sessionTitle').value.trim(),
            gameType: document.getElementById('gameType').value,
            betAmount: parseInt(document.getElementById('betAmount').value),
            sessionTime: document.getElementById('sessionTime').value,
            location: document.getElementById('location').value.trim() || '本店',
            description: document.getElementById('description').value.trim(),
            players: [{
                name: document.getElementById('hostName').value.trim(),
                joinTime: new Date().toISOString(),
                isHost: true
            }],
            maxPlayers: 4,
            status: 'waiting', // waiting, full, playing, completed
            createdAt: new Date().toISOString()
        };

        this.sessions.unshift(session);
        this.saveData();
        this.updateUI();

        // 清空表單
        document.getElementById('createSessionForm').reset();
        this.setDefaultDateTime();

        this.showNotification(`約局「${session.title}」創建成功！`, 'success');
        
        // 發送通知
        if (this.notificationSettings.notifyNewSession) {
            this.sendLineNotify(`新約局：${session.title}\n時間：${this.formatDateTime(session.sessionTime)}\n地點：${session.location}\n金額：$${session.betAmount}\n還需要 ${session.maxPlayers - session.players.length} 位玩家`);
        }
    }

    joinSession(sessionId, playerName) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (session.status !== 'waiting') {
            this.showNotification('此約局已無法加入', 'error');
            return;
        }

        if (session.players.length >= session.maxPlayers) {
            this.showNotification('此約局已滿員', 'error');
            return;
        }

        if (session.players.some(p => p.name === playerName)) {
            this.showNotification('您已在此約局中', 'error');
            return;
        }

        session.players.push({
            name: playerName,
            joinTime: new Date().toISOString(),
            isHost: false
        });

        if (session.players.length >= session.maxPlayers) {
            session.status = 'full';
            this.showNotification('約局已滿員，即將開始遊戲！', 'success');
            
            // 發送成桌通知
            if (this.notificationSettings.notifyFull) {
                const playerNames = session.players.map(p => p.name).join(', ');
                this.sendLineNotify(`成桌通知！\n約局：${session.title}\n玩家：${playerNames}\n時間：${this.formatDateTime(session.sessionTime)}\n地點：${session.location}`);
            }
        }

        this.saveData();
        this.updateUI();

        // 發送加入通知
        if (this.notificationSettings.notifyJoin) {
            this.sendLineNotify(`${playerName} 加入了約局「${session.title}」\n目前人數：${session.players.length}/${session.maxPlayers}`);
        }

        this.showNotification('成功加入約局！', 'success');
    }

    leaveSession(sessionId, playerName) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const playerIndex = session.players.findIndex(p => p.name === playerName);
        if (playerIndex === -1) {
            this.showNotification('您不在此約局中', 'error');
            return;
        }

        // 檢查是否為主持人
        if (session.players[playerIndex].isHost) {
            if (confirm('您是此約局的主持人，離開將會取消整個約局，確定要離開嗎？')) {
                this.cancelSession(sessionId);
            }
            return;
        }

        session.players.splice(playerIndex, 1);
        
        if (session.status === 'full') {
            session.status = 'waiting';
        }

        this.saveData();
        this.updateUI();
        this.showNotification('已離開約局', 'info');
    }

    startSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (session.players.length < 4) {
            this.showNotification('需要4位玩家才能開始遊戲', 'error');
            return;
        }

        session.status = 'playing';
        session.startTime = new Date().toISOString();
        
        this.saveData();
        this.updateUI();

        const playerNames = session.players.map(p => p.name).join(', ');
        this.showNotification('遊戲開始！', 'success');

        // 發送開始通知
        if (this.notificationSettings.notifyStart) {
            this.sendLineNotify(`遊戲開始！\n約局：${session.title}\n玩家：${playerNames}\n地點：${session.location}\n祝各位玩得愉快！`);
        }
    }

    cancelSession(sessionId) {
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return;

        const session = this.sessions[sessionIndex];
        if (confirm(`確定要取消約局「${session.title}」嗎？`)) {
            this.sessions.splice(sessionIndex, 1);
            this.saveData();
            this.updateUI();
            this.showNotification('約局已取消', 'info');
        }
    }

    checkSessionStatus() {
        const now = new Date();
        
        this.sessions.forEach(session => {
            const sessionTime = new Date(session.sessionTime);
            
            // 檢查是否過期
            if (session.status === 'waiting' && sessionTime < now) {
                session.status = 'expired';
                this.showNotification(`約局「${session.title}」已過期`, 'warning');
            }
            
            // 檢查是否該提醒
            const reminderTime = new Date(sessionTime.getTime() - 30 * 60000); // 30分鐘前提醒
            if (session.status === 'waiting' && reminderTime <= now && sessionTime > now && !session.reminded) {
                session.reminded = true;
                const playerNames = session.players.map(p => p.name).join(', ');
                this.sendLineNotify(`溫馨提醒：約局「${session.title}」即將開始\n時間：${this.formatDateTime(session.sessionTime)}\n地點：${session.location}\n已報名：${playerNames}\n還需要 ${session.maxPlayers - session.players.length} 位玩家`);
            }
        });
        
        this.saveData();
        this.updateUI();
    }

    filterSessions(filter) {
        this.currentFilter = filter;
        
        // 更新標籤樣式
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.updateSessionsList();
    }

    updateUI() {
        this.updateStats();
        this.updateSessionsList();
    }

    updateStats() {
        const activeSessions = this.sessions.filter(s => s.status === 'playing').length;
        const waitingSessions = this.sessions.filter(s => s.status === 'waiting');
        const waitingPlayers = waitingSessions.reduce((total, s) => total + (s.maxPlayers - s.players.length), 0);
        const todaySessions = this.sessions.filter(s => {
            const sessionDate = new Date(s.sessionTime).toDateString();
            const today = new Date().toDateString();
            return sessionDate === today;
        }).length;
        
        const totalSessions = this.sessions.filter(s => s.status !== 'expired').length;
        const successRate = totalSessions > 0 ? Math.round((this.sessions.filter(s => s.status === 'playing' || s.status === 'completed').length / totalSessions) * 100) : 0;

        document.getElementById('activeSessions').textContent = activeSessions;
        document.getElementById('waitingPlayers').textContent = waitingPlayers;
        document.getElementById('todaySessions').textContent = todaySessions;
        document.getElementById('successRate').textContent = successRate + '%';
    }

    updateSessionsList() {
        const container = document.getElementById('sessionsList');
        let filteredSessions = this.sessions;

        // 根據篩選條件過濾
        switch (this.currentFilter) {
            case 'waiting':
                filteredSessions = this.sessions.filter(s => s.status === 'waiting');
                break;
            case 'full':
                filteredSessions = this.sessions.filter(s => s.status === 'full');
                break;
            case 'playing':
                filteredSessions = this.sessions.filter(s => s.status === 'playing');
                break;
        }

        // 排除過期的約局
        filteredSessions = filteredSessions.filter(s => s.status !== 'expired');

        if (filteredSessions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">暫無約局</p>';
            return;
        }

        container.innerHTML = filteredSessions.map(session => {
            const statusClass = session.status === 'waiting' ? 'waiting' : 
                              session.status === 'full' ? 'full' : 'playing';
            const statusText = session.status === 'waiting' ? '等待中' : 
                             session.status === 'full' ? '已滿員' : '進行中';
            
            const gameTypeText = {
                'card': '卡牌遊戲',
                'board': '桌遊',
                'puzzle': '益智遊戲',
                'strategy': '策略遊戲'
            }[session.gameType] || session.gameType;

            const playersHtml = session.players.map(player => 
                `<div class="player-item">
                    <span class="player-name">${player.name} ${player.isHost ? '(主)' : ''}</span>
                    <span class="player-time">${this.formatTime(player.joinTime)}</span>
                </div>`
            ).join('');

            const emptySlots = Array(session.maxPlayers - session.players.length).fill(null).map(() => 
                '<div class="player-item"><span class="empty-slot">等待加入...</span></div>'
            ).join('');

            const userPlayerName = localStorage.getItem('lastPlayerName') || '';
            const isUserInSession = session.players.some(p => p.name === userPlayerName);
            const canJoin = !isUserInSession && session.status === 'waiting' && session.players.length < session.maxPlayers;
            const isHost = session.players.some(p => p.name === userPlayerName && p.isHost);

            return `
                <div class="session-card ${statusClass}">
                    <div class="session-header">
                        <div class="session-title">${session.title}</div>
                        <div class="session-status ${statusClass}">${statusText}</div>
                    </div>
                    
                    <div class="session-details">
                        <div class="detail-item">
                            <span class="detail-icon">🎮</span>
                            <span class="detail-text">${gameTypeText}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">💰</span>
                            <span class="detail-text">$${session.betAmount}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">⏰</span>
                            <span class="detail-text">${this.formatDateTime(session.sessionTime)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">📍</span>
                            <span class="detail-text">${session.location}</span>
                        </div>
                    </div>
                    
                    ${session.description ? `<div style="color: #cccccc; margin-bottom: 15px; font-size: 0.9rem;">${session.description}</div>` : ''}
                    
                    <div class="players-list">
                        <div style="color: #ffd700; font-weight: bold; margin-bottom: 10px;">
                            玩家 (${session.players.length}/${session.maxPlayers})
                        </div>
                        ${playersHtml}
                        ${emptySlots}
                    </div>
                    
                    <div class="session-actions">
                        ${canJoin ? `
                            <button class="action-btn btn-join" onclick="inviteSystem.promptJoin(${session.id})">
                                加入約局
                            </button>
                        ` : ''}
                        ${isUserInSession && !isHost ? `
                            <button class="action-btn btn-leave" onclick="inviteSystem.leaveSession(${session.id}, '${userPlayerName}')">
                                離開約局
                            </button>
                        ` : ''}
                        ${isHost && session.status === 'waiting' ? `
                            <button class="action-btn btn-start" onclick="inviteSystem.startSession(${session.id})">
                                開始遊戲
                            </button>
                        ` : ''}
                        ${isHost ? `
                            <button class="action-btn btn-cancel" onclick="inviteSystem.cancelSession(${session.id})">
                                取消約局
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    promptJoin(sessionId) {
        const playerName = prompt('請輸入您的暱稱：', localStorage.getItem('lastPlayerName') || '');
        if (playerName && playerName.trim()) {
            localStorage.setItem('lastPlayerName', playerName.trim());
            this.joinSession(sessionId, playerName.trim());
        }
    }

    saveNotificationSettings() {
        this.notificationSettings.lineNotifyToken = document.getElementById('lineNotifyToken').value.trim();
        this.notificationSettings.notifyNewSession = document.getElementById('notifyNewSession').checked;
        this.notificationSettings.notifyJoin = document.getElementById('notifyJoin').checked;
        this.notificationSettings.notifyFull = document.getElementById('notifyFull').checked;
        this.notificationSettings.notifyStart = document.getElementById('notifyStart').checked;

        localStorage.setItem('lineNotifyToken', this.notificationSettings.lineNotifyToken);
        localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));

        this.showNotification('通知設定已儲存', 'success');
    }

    loadNotificationSettings() {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            Object.assign(this.notificationSettings, JSON.parse(savedSettings));
        }

        document.getElementById('lineNotifyToken').value = this.notificationSettings.lineNotifyToken;
        document.getElementById('notifyNewSession').checked = this.notificationSettings.notifyNewSession;
        document.getElementById('notifyJoin').checked = this.notificationSettings.notifyJoin;
        document.getElementById('notifyFull').checked = this.notificationSettings.notifyFull;
        document.getElementById('notifyStart').checked = this.notificationSettings.notifyStart;
    }

    async sendLineNotify(message) {
        if (!this.notificationSettings.lineNotifyToken) {
            return;
        }

        try {
            const response = await fetch('https://notify-api.line.me/api/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${this.notificationSettings.lineNotifyToken}`
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

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleString('zh-TW', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return '剛剛';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} 分鐘前`;
        } else {
            return date.toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}

// 初始化系統
let inviteSystem;
document.addEventListener('DOMContentLoaded', () => {
    inviteSystem = new InviteSystem();
});
