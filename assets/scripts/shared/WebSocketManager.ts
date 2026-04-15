/**
 * WebSocket 通信管理器
 */

import { EventEmitter } from '../shared/EventEmitter';
import { SERVER_CONFIG } from '../shared/Constants';

/** WebSocket 消息类型 */
export enum WsMessageType {
    // 房间相关
    ROOM_CREATE = 'room/create',
    ROOM_JOIN = 'room/join',
    ROOM_LEAVE = 'room/leave',
    ROOM_PLAYER_JOIN = 'room/player_join',
    ROOM_PLAYER_LEAVE = 'room/player_leave',
    ROOM_PLAYER_READY = 'room/player_ready',
    ROOM_PLAYERS_UPDATE = 'room/players_update',
    ROOM_ADD_AI = 'room/add_ai',
    ROOM_REMOVE_AI = 'room/remove_ai',
    ROOM_QUICK_MATCH = 'room/quick_match',
    ROOM_LIST = 'room/list',

    // 游戏相关
    GAME_START = 'game/start',
    GAME_DEALT = 'game/dealt',
    GAME_LANDLORD_SELECTED = 'game/landlord_selected',
    GAME_LANDLORD_CARDS_SELECTED = 'game/landlord_cards_selected',
    GAME_TURN = 'game/turn',
    GAME_ACTION = 'game/action',
    GAME_PASS = 'game/pass',
    GAME_ROUND_CLEARED = 'game/round_cleared',
    GAME_OVER = 'game/over',
    GAME_READY = 'game/ready',

    // 通用
    HEARTBEAT = 'heartbeat',
    ERROR = 'error',
}

/** WebSocket 消息结构 */
export interface WsMessage {
    type: WsMessageType;
    data?: any;
    timestamp?: number;
}

/** WebSocket 连接状态 */
export enum WsConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
}

export class WebSocketManager extends EventEmitter {
    private static instance: WebSocketManager;

    private ws: WebSocket | null = null;
    private url: string = '';
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000;
    private heartbeatInterval: number = 0;
    private heartbeatTimeout: number = 0;
    private manualClose: boolean = false;

    private _state: WsConnectionState = WsConnectionState.DISCONNECTED;

    /** 连接状态 */
    get state(): WsConnectionState {
        return this._state;
    }

    /** 获取连接状态描述 */
    getStateText(): string {
        switch (this._state) {
            case WsConnectionState.CONNECTED:
                return '已连接';
            case WsConnectionState.CONNECTING:
                return '连接中...';
            case WsConnectionState.RECONNECTING:
                return '重连中...';
            case WsConnectionState.DISCONNECTED:
            default:
                return '未连接';
        }
    }

    /** 获取连接状态颜色 (r, g, b) */
    getStateColor(): { r: number, g: number, b: number } {
        switch (this._state) {
            case WsConnectionState.CONNECTED:
                return { r: 0, g: 255, b: 0 };     // 绿色
            case WsConnectionState.CONNECTING:
            case WsConnectionState.RECONNECTING:
                return { r: 136, g: 136, b: 136 }; // 灰色
            case WsConnectionState.DISCONNECTED:
            default:
                return { r: 255, g: 0, b: 0 };     // 红色
        }
    }

    private constructor() {
        super();
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
            // 首次获取实例时自动连接
            WebSocketManager.instance.autoConnect();
        }
        return WebSocketManager.instance;
    }

    /** 自动连接服务器 */
    private autoConnect(): void {
        // 服务器地址配置
        const serverUrl = SERVER_CONFIG.WS_URL;
        this.connect(serverUrl);
    }

    /**
     * 连接服务器
     * @param url WebSocket 服务器地址
     */
    connect(url: string): void {
        if (this._state === WsConnectionState.CONNECTING ||
            this._state === WsConnectionState.CONNECTED) {
            return;
        }

        this.url = url;
        this.manualClose = false;
        this._state = WsConnectionState.CONNECTING;

        try {
            this.ws = new WebSocket(url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            this.handleDisconnect();
        }
    }

    /**
     * 断开连接
     * @param manual 是否为手动断开（手动断开不自动重连）
     */
    disconnect(manual: boolean = true): void {
        this.manualClose = manual;
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this._state = WsConnectionState.DISCONNECTED;
        try { this.emit('stateChange', this._state); } catch (e) {}
    }

    /**
     * 发送消息
     * @param type 消息类型
     * @param data 消息数据
     */
    send(type: WsMessageType, data?: any): void {
        if (this._state !== WsConnectionState.CONNECTED || !this.ws) {
            console.warn('[WebSocket] Not connected, cannot send message');
            return;
        }

        const message: WsMessage = {
            type,
            data,
            timestamp: Date.now(),
        };

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
        }
    }

    /** 发送心跳 */
    private sendHeartbeat(): void {
        this.send(WsMessageType.HEARTBEAT);
    }

    /** 开始心跳 */
    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000) as unknown as number; // 30秒心跳

        // 心跳超时检测
        this.heartbeatTimeout = setTimeout(() => {
            console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
            this.handleReconnect();
        }, 35000) as unknown as number;
    }

    /** 停止心跳 */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = 0;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = 0;
        }
    }

    /** 设置事件处理器 */
    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this._state = WsConnectionState.CONNECTED;
            this.reconnectAttempts = 0;
            try { this.emit('stateChange', this._state); } catch (e) {}
            try { this.emit('connect'); } catch (e) {}
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WsMessage = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
            try { this.emit('error', error); } catch (e) {}
        };

        this.ws.onclose = (event) => {
            this.stopHeartbeat();
            this.handleDisconnect();
        };
    }

    /** 处理收到的消息 */
    private handleMessage(message: WsMessage): void {
        // 收到心跳响应，清除超时
        if (message.type === WsMessageType.HEARTBEAT && this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = 0;
            return;
        }

        // 停止心跳超时
        this.stopHeartbeat();
        this.startHeartbeat();

        // 触发消息事件
        try {
            this.emit('message', message);
        } catch (e) {}

        // 根据类型触发具体事件
        try {
            this.emit(message.type, message.data);
        } catch (e) {}

        // 触发所有监听该类型的事件
        try {
            this.emit('*', message);
        } catch (e) {}
    }

    /** 处理断开连接 */
    private handleDisconnect(): void {
        this._state = WsConnectionState.DISCONNECTED;
        try { this.emit('stateChange', this._state); } catch (e) {}
        try { this.emit('disconnect'); } catch (e) {}

        if (!this.manualClose) {
            this.handleReconnect();
        }
    }

    /** 处理重连 */
    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            try { this.emit('reconnectFailed'); } catch (e) {}
            return;
        }

        this._state = WsConnectionState.RECONNECTING;
        try { this.emit('stateChange', this._state); } catch (e) {}

        this.reconnectAttempts++;

        setTimeout(() => {
            this.connect(this.url);
        }, this.reconnectDelay);
    }

    // ==================== 便捷方法 ====================

    /** 创建房间 */
    createRoom(roomType: number): void {
        this.send(WsMessageType.ROOM_CREATE, { roomType });
    }

    /** 加入房间 */
    joinRoom(roomId: number): void {
        this.send(WsMessageType.ROOM_JOIN, { roomId });
    }

    /** 离开房间 */
    leaveRoom(roomId: number): void {
        this.send(WsMessageType.ROOM_LEAVE, { roomId });
    }

    /** 玩家准备 */
    playerReady(roomId: number, ready: boolean): void {
        this.send(WsMessageType.ROOM_PLAYER_READY, { roomId, ready });
    }

    /** 获取房间列表 */
    getRoomList(): void {
        this.send(WsMessageType.ROOM_LIST);
    }

    /** 开始游戏 */
    startGame(roomId: number): void {
        this.send(WsMessageType.GAME_START, { roomId });
    }

    /** 游戏动作（出牌/不出） */
    gameAction(roomId: number, action: { cards?: number[], actionType?: string }): void {
        this.send(WsMessageType.GAME_ACTION, { roomId, ...action });
    }
}