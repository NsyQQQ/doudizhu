export declare class WebSocketHandler {
    private wss;
    private clients;
    private gameRooms;
    initialize(server: any): void;
    /** 处理消息 */
    private handleMessage;
    /** 认证 */
    private handleAuth;
    /** 创建房间 */
    private handleCreateRoom;
    /** 加入房间 */
    private handleJoinRoom;
    /** 离开房间 */
    private handleLeaveRoom;
    /** 玩家准备 */
    private handlePlayerReady;
    /** 添加AI */
    private handleAddAI;
    /** 移除AI */
    private handleRemoveAI;
    /** 快速匹配 - 创建房间并自动添加AI后开始游戏 */
    private handleQuickMatch;
    /** 开始游戏 */
    private handleStartGame;
    /** 处理出牌 */
    private handleGameAction;
    /** 处理跳过 */
    private handleGamePass;
    /** 处理客户端准备就绪（动画播放完成） */
    private handleGameReady;
    /** 设置房间事件监听 */
    private setupRoomListeners;
    /** 处理断开连接 */
    private handleDisconnect;
    /** 根据用户ID查找客户端WebSocket */
    private getClientWsByUserId;
    /** 发送消息给单个客户端 */
    private send;
    /** 广播消息给房间内所有玩家 */
    private broadcastToRoom;
}
export declare const wsHandler: WebSocketHandler;
//# sourceMappingURL=WebSocketHandler.d.ts.map