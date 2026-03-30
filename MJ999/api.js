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
