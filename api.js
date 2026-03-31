// Vercel Serverless Function
export async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // 處理 LINE Token 交換
    if (path === '/api/line/token' && method === 'POST') {
        try {
            const { code, state } = await req.json();
            
            const LINE_CONFIG = {
                clientId: '2009653134',
                clientSecret: process.env.LINE_CLIENT_SECRET || 'c0cf92398cab27e13a8402501489ff0e',
                redirectUri: 'https://mj999-2168.vercel.app/'
            };
            
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
                }).toString()
            });
            
            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                return new Response(JSON.stringify({
                    error: 'Token exchange failed',
                    message: errorText
                }), {
                    status: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
            
            const tokenData = await tokenResponse.json();
            
            return new Response(JSON.stringify(tokenData), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
            
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }

    // 處理 CORS 預檢請求
    if (method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // 404 回應
    return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Cannot ${method} ${path}`
    }), {
        status: 404,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
