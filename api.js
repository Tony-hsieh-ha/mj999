// LINE Notify 通知函式
class LineNotifyService {
    constructor() {
        this.token = null;
        this.initToken();
    }

    // 初始化 Token
    initToken() {
        // 從環境變數獲取 Token
        if (typeof process !== 'undefined' && process.env?.LINE_NOTIFY_TOKEN) {
            this.token = process.env.LINE_NOTIFY_TOKEN;
        } else {
            // 從 localStorage 獲取（開發用）
            this.token = localStorage.getItem('lineNotifyToken') || '';
        }
    }

    // 發送 LINE Notify 通知
    async sendNotification(message) {
        if (!this.token) {
            console.warn('LINE Notify Token 未設定');
            return { success: false, message: 'Token 未設定' };
        }

        try {
            const response = await fetch('https://notify-api.line.me/api/notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${this.token}`
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

    // 發送 3 缺 1 通知
    async sendNearCompleteNotification(amount, players, location = '[預設店名]') {
        const playerNames = players.map(p => p.nickname).join(', ');
        const message = `【MJ999 揪團】目前有一桌 3 缺 1！想打的快來報名！地點：${location}\n\n目前玩家：${playerNames}\n金額：$${amount}`;
        
        return await this.sendNotification(message);
    }

    // 發送開桌通知
    async sendTableStartNotification(players, location = '[預設店名]') {
        const playerNames = players.map(p => p.nickname).join(', ');
        const message = `【MJ999 開桌】桌子已開始遊戲！\n\n玩家：${playerNames}\n地點：${location}`;
        
        return await this.sendNotification(message);
    }

    // 發送系統通知
    async sendSystemNotification(message) {
        const systemMessage = `【MJ999 系統】${message}`;
        return await this.sendNotification(systemMessage);
    }

    // 測試通知
    async testNotification() {
        const testMessage = `【MJ999 測試】LINE Notify 功能正常！\n\n測試時間：${new Date().toLocaleString('zh-TW')}`;
        return await this.sendNotification(testMessage);
    }

    // 更新 Token
    updateToken(newToken) {
        this.token = newToken;
        localStorage.setItem('lineNotifyToken', newToken);
    }

    // 檢查 Token 狀態
    async checkTokenStatus() {
        if (!this.token) {
            return { valid: false, message: 'Token 未設定' };
        }

        try {
            const response = await fetch('https://notify-api.line.me/api/status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { valid: true, data };
            } else {
                return { valid: false, message: 'Token 無效' };
            }
        } catch (error) {
            return { valid: false, message: `檢查錯誤: ${error.message}` };
        }
    }
}

// API 安全保護機制
class SecureAPI {
    constructor() {
        this.adminPassword = null;
        this.init();
    }

    async init() {
        // 從環境變數獲取管理員密碼
        this.adminPassword = await this.getAdminPassword();
    }

    // 獲取管理員密碼
    async getAdminPassword() {
        // 在 Vercel 環境中從環境變數獲取
        if (typeof process !== 'undefined' && process.env?.ADMIN_PASSWORD) {
            return process.env.ADMIN_PASSWORD;
        }
        
        // 在開發環境中從 localStorage 獲取
        return localStorage.getItem('adminPassword') || 'admin123';
    }

    // 驗證管理員權限
    verifyAdminAuth(req) {
        // 檢查請求頭中的認證資訊
        const authHeader = req.headers.get('Authorization');
        const sessionToken = req.headers.get('X-Admin-Token');
        
        // 方法1: Bearer Token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            return this.validateToken(token);
        }
        
        // 方法2: Session Token
        if (sessionToken) {
            return this.validateSessionToken(sessionToken);
        }
        
        // 方法3: 查詢參數 (開發用)
        const url = new URL(req.url);
        const token = url.searchParams.get('admin_token');
        if (token) {
            return this.validateToken(token);
        }
        
        return false;
    }

    // 驗證 Token
    validateToken(token) {
        try {
            // 簡單的 token 驗證 (實際環境中應使用 JWT)
            const decoded = atob(token);
            const data = JSON.parse(decoded);
            
            // 檢查 token 是否過期
            if (data.expiry && Date.now() > data.expiry) {
                return false;
            }
            
            // 檢查密碼是否正確
            return data.password === this.adminPassword;
        } catch (error) {
            return false;
        }
    }

    // 驗證 Session Token
    validateSessionToken(sessionToken) {
        const sessionData = localStorage.getItem(`adminSession_${sessionToken}`);
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            
            // 檢查 session 是否過期
            if (session.expiry && Date.now() > session.expiry) {
                localStorage.removeItem(`adminSession_${sessionToken}`);
                return false;
            }
            
            return session.authenticated;
        } catch (error) {
            return false;
        }
    }

    // 生成管理員 Token
    generateAdminToken() {
        const payload = {
            password: this.adminPassword,
            timestamp: Date.now(),
            expiry: Date.now() + (60 * 60 * 1000) // 1小時過期
        };
        
        return btoa(JSON.stringify(payload));
    }

    // 生成 Session Token
    generateSessionToken() {
        const token = 'admin_' + Math.random().toString(36).substr(2, 9);
        const expiry = Date.now() + (60 * 60 * 1000); // 1小時過期
        
        const sessionData = {
            authenticated: true,
            expiry: expiry
        };
        
        localStorage.setItem(`adminSession_${token}`, JSON.stringify(sessionData));
        return token;
    }

    // HTTP 403 回應
    create403Response(message = 'Forbidden') {
        return new Response(JSON.stringify({
            error: 'Access Denied',
            message: message,
            status: 403
        }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token'
            }
        });
    }

    // HTTP 401 回應
    create401Response(message = 'Unauthorized') {
        return new Response(JSON.stringify({
            error: 'Authentication Required',
            message: message,
            status: 401
        }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // CORS 預檢查
    handleCORS(req) {
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
            'Access-Control-Max-Age': '86400'
        };

        if (req.method === 'OPTIONS') {
            return new Response(null, { headers });
        }

        return null;
    }

    // 包裝 API 路由
    wrapAdminRoute(handler) {
        return async (req) => {
            // CORS 預檢查
            const corsResponse = this.handleCORS(req);
            if (corsResponse) return corsResponse;

            // 驗證管理員權限
            if (!this.verifyAdminAuth(req)) {
                return this.create403Response('需要管理員權限');
            }

            // 執行原始處理函數
            try {
                return await handler(req);
            } catch (error) {
                console.error('Admin API Error:', error);
                return new Response(JSON.stringify({
                    error: 'Internal Server Error',
                    message: error.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        };
    }

    // 包裝公開 API 路由
    wrapPublicRoute(handler) {
        return async (req) => {
            // CORS 預檢查
            const corsResponse = this.handleCORS(req);
            if (corsResponse) return corsResponse;

            // 執行原始處理函數
            try {
                return await handler(req);
            } catch (error) {
                console.error('Public API Error:', error);
                return new Response(JSON.stringify({
                    error: 'Internal Server Error',
                    message: error.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        };
    }
}

// API 路由定義
class APIRoutes {
    constructor() {
        this.secureAPI = new SecureAPI();
        this.mockAPI = new MockAPI();
    }

    // 公開路由 - 獲取報名列表
    async getRegistrations(req) {
        const registrations = this.mockAPI.getRegistrations();
        return new Response(JSON.stringify(registrations), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 公開路由 - 獲取統計資訊
    async getStats(req) {
        const registrations = this.mockAPI.getRegistrations();
        const stats = {
            total: registrations.length,
            waiting: registrations.filter(r => r.status === 'waiting').length,
            matched: registrations.filter(r => r.status === 'matched').length,
            playing: registrations.filter(r => r.status === 'playing').length,
            amountStats: this.calculateAmountStats(registrations)
        };
        
        return new Response(JSON.stringify(stats), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理員路由 - 新增報名
    async addRegistration(req) {
        const data = await req.json();
        
        const registration = {
            id: Date.now(),
            ...data,
            timestamp: new Date().toISOString(),
            status: 'waiting'
        };

        const registrations = this.mockAPI.getRegistrations();
        registrations.push(registration);
        this.mockAPI.saveRegistrations(registrations);

        return new Response(JSON.stringify(registration), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理員路由 - 刪除報名
    async deleteRegistration(req) {
        const url = new URL(req.url);
        const id = parseInt(url.pathname.split('/').pop());
        
        const registrations = this.mockAPI.getRegistrations();
        const filteredRegistrations = registrations.filter(r => r.id !== id);
        
        if (registrations.length === filteredRegistrations.length) {
            return new Response(JSON.stringify({
                error: 'Registration not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        this.mockAPI.saveRegistrations(filteredRegistrations);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Registration deleted'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理員路由 - 更新報名
    async updateRegistration(req) {
        const url = new URL(req.url);
        const id = parseInt(url.pathname.split('/').pop());
        const data = await req.json();
        
        const registrations = this.mockAPI.getRegistrations();
        const registration = registrations.find(r => r.id === id);
        
        if (!registration) {
            return new Response(JSON.stringify({
                error: 'Registration not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        Object.assign(registration, data);
        this.mockAPI.saveRegistrations(registrations);

        return new Response(JSON.stringify(registration), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理員路由 - 清空所有報名
    async clearAllRegistrations(req) {
        this.mockAPI.saveRegistrations([]);
        
        return new Response(JSON.stringify({
            success: true,
            message: 'All registrations cleared'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理員路由 - 手動配對
    async createTable(req) {
        const data = await req.json();
        const registrations = this.mockAPI.getRegistrations();
        const waitingRegistrations = registrations.filter(r => r.status === 'waiting');
        
        if (waitingRegistrations.length < 4) {
            return new Response(JSON.stringify({
                error: 'Not enough players for a table'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const table = await this.mockAPI.checkForCompleteTable(data.amount || '30/10');
        
        return new Response(JSON.stringify(table), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 計算金額統計
    calculateAmountStats(registrations) {
        const stats = {};
        const amounts = ['30/10', '60/20', '100/20', '200/50'];
        
        amounts.forEach(amount => {
            stats[amount] = registrations.filter(r => r.amount === amount).length;
        });
        
        return stats;
    }

    // 處理 LINE Token 交換
    async handleLineToken(req) {
        try {
            const { code, state } = await req.json();
            
            // LINE Token 交換設定
            const LINE_CONFIG = {
                clientId: '2004473747',
                clientSecret: process.env.LINE_CLIENT_SECRET || 'a5ef8b23a930a8320c273f21badc78c2',
                redirectUri: 'https://mj999-2168.vercel.app/' // 確認最後面有一個斜線，與 LINE 後台一致
            };
            
            // 向 LINE 請求 access token
            const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: LINE_CONFIG.redirectUri,
                    client_id: LINE_CONFIG.clientId,
                    client_secret: LINE_CONFIG.clientSecret
                })
            });
            
            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error('LINE Token 交換失敗:', errorText);
                return new Response(JSON.stringify({
                    error: 'Token exchange failed',
                    message: errorText
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const tokenData = await tokenResponse.json();
            
            return new Response(JSON.stringify(tokenData), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } catch (error) {
            console.error('處理 LINE Token 時發生錯誤:', error);
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
}

// Vercel Serverless Function 路由器
export default async function handler(req) {
    const apiRoutes = new APIRoutes();
    const url = new URL(req.url);
    const path = url.pathname;

    // 路由映射
    const routes = {
        // 公開路由
        'GET /api/registrations': apiRoutes.secureAPI.wrapPublicRoute(() => apiRoutes.getRegistrations(req)),
        'GET /api/stats': apiRoutes.secureAPI.wrapPublicRoute(() => apiRoutes.getStats(req)),
        
        // LINE 登入路由
        'POST /api/line/token': apiRoutes.secureAPI.wrapPublicRoute(() => apiRoutes.handleLineToken(req)),
        
        // 管理員路由
        'POST /api/registrations': apiRoutes.secureAPI.wrapAdminRoute(() => apiRoutes.addRegistration(req)),
        'PUT /api/registrations/:id': apiRoutes.secureAPI.wrapAdminRoute(() => apiRoutes.updateRegistration(req)),
        'DELETE /api/registrations/:id': apiRoutes.secureAPI.wrapAdminRoute(() => apiRoutes.deleteRegistration(req)),
        'DELETE /api/registrations': apiRoutes.secureAPI.wrapAdminRoute(() => apiRoutes.clearAllRegistrations(req)),
        'POST /api/tables': apiRoutes.secureAPI.wrapAdminRoute(() => apiRoutes.createTable(req)),
    };

    // 簡單的路由匹配
    for (const [route, handler] of Object.entries(routes)) {
        const [method, routePath] = route.split(' ');
        
        if (req.method === method) {
            // 簡單的路由匹配邏輯
            if (routePath === path) {
                return await handler;
            }
            
            // 支援參數路由 (如 /api/registrations/:id)
            const routeParts = routePath.split('/');
            const pathParts = path.split('/');
            
            if (routeParts.length === pathParts.length) {
                const isMatch = routeParts.every((part, index) => {
                    return part.startsWith(':') || part === pathParts[index];
                });
                
                if (isMatch) {
                    return await handler;
                }
            }
        }
    }

    // 404 回應
    return new Response(JSON.stringify({
        error: 'Route not found',
        message: `Cannot ${req.method} ${path}`
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

// 擴展 MockAPI 以支援儲存
MockAPI.prototype.saveRegistrations = function(registrations) {
    localStorage.setItem('mahjongRegistrations', JSON.stringify(registrations));
};
