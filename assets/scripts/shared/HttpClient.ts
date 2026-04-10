/**
 * HTTP 客户端工具
 */

const BASE_URL = 'http://localhost:3000';

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
}

/** 微信小程序/小游戏环境判断 */
const isMiniProgram = typeof wx !== 'undefined' && wx.request;

/** 微信小程序 request 方法 */
function wxRequest(options: any): Promise<any> {
    return new Promise((resolve, reject) => {
        wx.request({
            ...options,
            success: (res: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                } else {
                    reject(new Error(res.data?.error || `HTTP ${res.statusCode}`));
                }
            },
            fail: (err: any) => reject(err),
        });
    });
}

export class HttpClient {
    static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = `${BASE_URL}${endpoint}`;
        const { method = 'GET', headers = {}, body } = options;

        if (isMiniProgram) {
            // 微信小程序环境
            try {
                const data = await wxRequest({
                    url,
                    method,
                    header: {
                        'Content-Type': 'application/json',
                        ...headers,
                    },
                    data: body,
                });
                return data as T;
            } catch (error) {
                console.error(`[HttpClient] ${method} ${endpoint} failed:`, error);
                throw error;
            }
        } else {
            // 浏览器环境
            const config: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            };

            if (body) {
                config.body = JSON.stringify(body);
            }

            try {
                const response = await fetch(url, config);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                return data as T;
            } catch (error) {
                console.error(`[HttpClient] ${method} ${endpoint} failed:`, error);
                throw error;
            }
        }
    }

    static async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    static async post<T>(endpoint: string, body: any): Promise<T> {
        return this.request<T>(endpoint, { method: 'POST', body });
    }
}

interface LoginResponse {
    success: boolean;
    data?: {
        id: number;
        openid: string;
        nickname: string;
        avatar: string;
        room_id: number;
    };
    error?: string;
}

export async function loginByOpenid(openid: string): Promise<LoginResponse> {
    return HttpClient.post<LoginResponse>('/api/user/login', {
        openid,
        nickname: `玩家${openid}`,
        avatar: '',
    });
}

interface CheckUserResponse {
    exists: boolean;
    data?: {
        id: number;
        openid: string;
        nickname: string;
        avatar: string;
    };
    error?: string;
}

export async function checkUserExists(openid: string): Promise<CheckUserResponse> {
    return HttpClient.get<CheckUserResponse>(`/api/user/check/${openid}`);
}
