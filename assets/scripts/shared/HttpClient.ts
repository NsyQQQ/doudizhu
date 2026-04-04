/**
 * HTTP 客户端工具
 */

const BASE_URL = 'http://192.168.31.12:3000';

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
}

export class HttpClient {
    static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = `${BASE_URL}${endpoint}`;
        const { method = 'GET', headers = {}, body } = options;

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
