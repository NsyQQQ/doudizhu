"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsHandler = exports.WebSocketHandler = void 0;
const ws_1 = __importStar(require("ws"));
const GameRoomManager_1 = require("../game/GameRoomManager");
const GameRoom_1 = require("../game/GameRoom");
const UserService_1 = require("../services/UserService");
class WebSocketHandler {
    constructor() {
        this.wss = null;
        this.clients = new Map();
        this.gameRooms = new GameRoomManager_1.GameRoomManager();
    }
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({ server });
        this.wss.on('connection', (ws, req) => {
            this.clients.set(ws, {
                ws,
                userId: 0,
                nickname: '',
                roomCode: null,
                playerIndex: null,
                turnNotified: false,
                clientReady: false,
                lateClient: false
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                }
                catch (error) {
                    console.error('[WebSocket] Parse message error:', error);
                }
            });
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            ws.on('error', (error) => {
                console.error('[WebSocket] Error:', error);
            });
        });
    }
    /** 处理消息 */
    async handleMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client)
            return;
        switch (message.type) {
            case 'auth':
                await this.handleAuth(ws, client, message.data);
                break;
            case 'room/create':
                await this.handleCreateRoom(ws, client, message.data);
                break;
            case 'room/join':
                await this.handleJoinRoom(ws, client, message.data);
                break;
            case 'room/leave':
                await this.handleLeaveRoom(ws, client);
                break;
            case 'room/player_ready':
                await this.handlePlayerReady(ws, client, message.data);
                break;
            case 'room/add_ai':
                await this.handleAddAI(ws, client, message.data);
                break;
            case 'room/remove_ai':
                await this.handleRemoveAI(ws, client, message.data);
                break;
            case 'room/quick_match':
                await this.handleQuickMatch(ws, client, message.data);
                break;
            case 'game/start':
                await this.handleStartGame(ws, client);
                break;
            case 'game/action':
                await this.handleGameAction(ws, client, message.data);
                break;
            case 'game/pass':
                await this.handleGamePass(ws, client);
                break;
            case 'game/ready':
                await this.handleGameReady(ws, client);
                break;
            case 'game/landlord_cards_selected':
                await this.handleLandlordCardsSelected(ws, client, message.data);
                break;
            case 'heartbeat':
                this.send(ws, { type: 'heartbeat' });
                break;
            default:
        }
    }
    /** 认证 */
    async handleAuth(ws, client, data) {
        // 如果没有userId，生成一个临时的（用于测试）
        if (!data.userId) {
            data.userId = Math.floor(Math.random() * 10000) + 1;
        }
        client.userId = data.userId;
        client.nickname = data.nickname || `Player${client.userId}`;
        this.send(ws, { type: 'auth', data: { success: true, userId: client.userId } });
    }
    /** 创建房间 */
    async handleCreateRoom(ws, client, data) {
        try {
            const userId = data.userId;
            const roomType = data.roomType || 5; // 默认5（6人斗地主）
            console.log(`[handleCreateRoom] received data.roomType=${data.roomType}, using roomType=${roomType}`);
            // 尝试获取用户信息，如果不存在则创建一个测试用户
            let user = await UserService_1.userService.findById(userId);
            if (!user) {
                // 创建测试用户
                user = await UserService_1.userService.findOrCreateByOpenid(`test_${userId}`, `玩家${userId}`, '');
            }
            if (!user) {
                this.send(ws, { type: 'room/create', data: { success: false, error: '用户创建失败' } });
                return;
            }
            // 创建房间
            const room = await this.gameRooms.createRoom(userId, {
                id: userId,
                openid: user.openid,
                nickname: user.nickname || '玩家',
                avatar: user.avatar || '',
                isReady: true, // 房主默认准备
                isHost: true,
                isAI: false,
                isHiddenLandlord: false
            }, roomType);
            client.roomCode = room.roomCode;
            client.playerIndex = 0; // 房主是位置0
            client.userId = userId; // 设置用户ID
            // 更新用户房间ID
            await UserService_1.userService.updateRoomId(userId, room.roomId);
            // 监听房间事件
            this.setupRoomListeners(room);
            const players = room.getPlayers();
            this.send(ws, {
                type: 'room/create',
                data: {
                    success: true,
                    room: {
                        id: room.roomId,
                        roomCode: room.roomCode,
                        type: roomType,
                        players: players
                    }
                }
            });
            // 广播房间更新（不排除任何人，因为房间刚创建）
            this.broadcastToRoom(room.roomCode, {
                type: 'room/players_update',
                data: { players: players }
            });
        }
        catch (error) {
            console.error('[WebSocket] handleCreateRoom error:', error);
            this.send(ws, { type: 'room/create', data: { success: false, error: '创建房间失败' } });
        }
    }
    /** 加入房间 */
    async handleJoinRoom(ws, client, data) {
        try {
            const { roomCode, roomType, userId } = data;
            const room = this.gameRooms.findByRoomCode(roomCode);
            if (!room) {
                this.send(ws, { type: 'room/join', data: { success: false, error: '房间不存在' } });
                return;
            }
            // 检查房间类型是否匹配
            if (room.roomType !== roomType) {
                this.send(ws, { type: 'room/join', data: { success: false, error: '房间类型不匹配' } });
                return;
            }
            if (room.getStatus() !== 'waiting') {
                this.send(ws, { type: 'room/join', data: { success: false, error: '房间已开始游戏' } });
                return;
            }
            // 获取用户信息，如果不存在则创建测试用户
            let user = await UserService_1.userService.findById(userId);
            if (!user) {
                user = await UserService_1.userService.findOrCreateByOpenid(`test_${userId}`, `玩家${userId}`, '');
            }
            if (!user) {
                this.send(ws, { type: 'room/join', data: { success: false, error: '用户不存在' } });
                return;
            }
            const result = this.gameRooms.joinRoom(roomCode, {
                id: userId,
                openid: user.openid,
                nickname: user.nickname || '玩家',
                avatar: user.avatar || '',
                isReady: false,
                isHost: false,
                isAI: false,
                isHiddenLandlord: false
            });
            if (!result) {
                this.send(ws, { type: 'room/join', data: { success: false, error: '房间已满' } });
                return;
            }
            client.roomCode = roomCode;
            client.playerIndex = result.position;
            client.userId = userId; // 设置用户ID
            await UserService_1.userService.updateRoomId(userId, room.roomId);
            // 确保房间事件已监听
            this.setupRoomListeners(room);
            this.send(ws, {
                type: 'room/join',
                data: {
                    success: true,
                    room: {
                        id: room.roomId,
                        roomCode: room.roomCode,
                        type: room.roomType,
                        players: room.getPlayers()
                    },
                    playerIndex: result.position
                }
            });
            // 广播新玩家加入
            this.broadcastToRoom(roomCode, {
                type: 'room/player_join',
                data: {
                    player: { id: userId, nickname: user.nickname, isReady: false },
                    players: room.getPlayers()
                }
            });
        }
        catch (error) {
            console.error('[WebSocket] handleJoinRoom error:', error);
            this.send(ws, { type: 'room/join', data: { success: false, error: '加入房间失败' } });
        }
    }
    /** 离开房间 */
    async handleLeaveRoom(ws, client) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        const playerId = client.userId;
        const playerIndex = client.playerIndex;
        const roomCode = client.roomCode;
        // 检查是否是房主（host）
        const players = room.getPlayers();
        const currentPlayer = players[playerIndex];
        const isHost = currentPlayer?.isHost || false;
        if (isHost) {
            // 房主离开：解散房间
            console.log(`[handleLeaveRoom] host ${playerId} leaving, destroying room ${roomCode}`);
            this.gameRooms.destroyRoom(roomCode);
            this.broadcastToRoom(roomCode, {
                type: 'room/player_leave',
                data: { playerIndex, players: [], isHostLeft: true, roomDestroyed: true }
            });
        }
        else {
            // 非房主离开：只移除玩家，保留房间
            this.gameRooms.leaveRoom(playerId);
            this.broadcastToRoom(roomCode, {
                type: 'room/player_leave',
                data: { playerIndex, players: room.getPlayers(), isHostLeft: false, roomDestroyed: false }
            });
        }
        client.roomCode = null;
        client.playerIndex = null;
    }
    /** 玩家准备 */
    async handlePlayerReady(ws, client, data) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        room.setPlayerReady(client.userId, data.ready);
        this.broadcastToRoom(client.roomCode, {
            type: 'room/player_ready',
            data: { playerIndex: client.playerIndex, ready: data.ready, players: room.getPlayers() }
        });
    }
    /** 添加AI */
    async handleAddAI(ws, client, data) {
        if (!client.roomCode)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 检查是否是房主
        const players = room.getPlayers();
        const hostPlayer = players.find(p => p && p.isHost);
        if (!hostPlayer || hostPlayer.id !== client.userId) {
            this.send(ws, { type: 'room/add_ai', data: { success: false, error: '只有房主可以添加AI' } });
            return;
        }
        const targetPosition = data.position ?? -1;
        // 获取当前已使用的AI名字，避免重复
        const usedNames = players
            .filter(p => p && p.isAI && p.nickname)
            .map(p => p.nickname);
        const allAiNames = ['小智', '小红', '小明', '小强', '小芳', '小刚'];
        const availableNames = allAiNames.filter(n => !usedNames.includes(n));
        let aiName;
        if (availableNames.length > 0) {
            aiName = availableNames[Math.floor(Math.random() * availableNames.length)];
        }
        else {
            aiName = `AI${targetPosition}`;
        }
        const result = room.addAI(targetPosition, aiName);
        if (!result.success) {
            this.send(ws, { type: 'room/add_ai', data: { success: false, error: result.error } });
            return;
        }
        this.broadcastToRoom(client.roomCode, {
            type: 'room/add_ai',
            data: { success: true, position: result.position, players: room.getPlayers() }
        });
    }
    /** 移除AI */
    async handleRemoveAI(ws, client, data) {
        if (!client.roomCode)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 检查是否是房主
        const players = room.getPlayers();
        const hostPlayer = players.find(p => p && p.isHost);
        if (!hostPlayer || hostPlayer.id !== client.userId) {
            this.send(ws, { type: 'room/remove_ai', data: { success: false, error: '只有房主可以移除AI' } });
            return;
        }
        const result = room.removeAI(data.position);
        if (!result.success) {
            this.send(ws, { type: 'room/remove_ai', data: { success: false, error: result.error } });
            return;
        }
        this.broadcastToRoom(client.roomCode, {
            type: 'room/remove_ai',
            data: { success: true, position: data.position, players: room.getPlayers() }
        });
    }
    /** 快速匹配 - 创建房间并自动添加AI后开始游戏 */
    async handleQuickMatch(ws, client, data) {
        const userId = data?.userId ?? client.userId;
        const roomType = data?.roomType ?? 5;
        console.log(`[handleQuickMatch] received roomType=${data?.roomType}, using roomType=${roomType}, client.roomCode=${client.roomCode}`);
        // 检查玩家是否已在其他房间中，如果有则先离开
        const existingRoomByPlayer = this.gameRooms.getPlayerRoom(userId);
        if (existingRoomByPlayer) {
            console.log(`[handleQuickMatch] player ${userId} already in room ${client.roomCode}, leaving first`);
            this.gameRooms.leaveRoom(userId);
            client.roomCode = null;
            client.playerIndex = null;
        }
        // 如果客户端已在房间中，检查是否需要重开游戏
        if (client.roomCode) {
            const existingRoom = this.gameRooms.findByRoomCode(client.roomCode);
            if (existingRoom) {
                const roomStatus = existingRoom.status;
                console.log(`[handleQuickMatch] existing room status=${roomStatus}, type=${existingRoom.roomType}`);
                // 如果游戏已结束，调用 restartGame 重开（保持在同一房间）
                if (roomStatus === 'ended' || roomStatus === 'playing') {
                    console.log(`[handleQuickMatch] calling restartGame on existing room`);
                    const restartResult = existingRoom.restartGame ? existingRoom.restartGame() : false;
                    if (!restartResult) {
                        this.send(ws, { type: 'room/quick_match', data: { success: false, error: '重开游戏失败' } });
                        return;
                    }
                    // 重开后直接发送 room/quick_match 响应（包含发牌数据）
                    const playerHand = existingRoom.getPlayerHand(client.playerIndex);
                    const landlordCards = existingRoom.getLandlordCards();
                    const landlordId = existingRoom.landlordId;
                    const hiddenLandlordIds = existingRoom.hiddenLandlordIds || [];
                    const isLandlord = client.playerIndex === landlordId;
                    const handCards = isLandlord ? [...(playerHand || []), ...landlordCards] : (playerHand || []);
                    // 重置客户端的重连状态
                    client.turnNotified = false;
                    this.send(ws, {
                        type: 'room/quick_match',
                        data: {
                            success: true,
                            room: {
                                id: existingRoom.roomId,
                                roomCode: existingRoom.roomCode,
                                type: existingRoom.roomType,
                                players: existingRoom.getPlayers()
                            },
                            dealt: {
                                hand: handCards,
                                landlordCards: landlordCards || [],
                                landlordId: landlordId,
                                hiddenLandlordIds: hiddenLandlordIds
                            }
                        }
                    });
                    return;
                }
                // 游戏未结束，先离开旧房间
                console.log(`[handleQuickMatch] leaving old room=${client.roomCode}, type=${existingRoom.roomType}`);
                this.gameRooms.leaveRoom(client.userId);
                client.roomCode = null;
                client.playerIndex = null;
            }
        }
        // 获取或创建用户
        let user = await UserService_1.userService.findById(userId);
        if (!user) {
            user = await UserService_1.userService.findOrCreateByOpenid(`test_${userId}`, `玩家${userId}`, '');
        }
        if (!user) {
            this.send(ws, { type: 'room/quick_match', data: { success: false, error: '用户创建失败' } });
            return;
        }
        // 创建房间
        const room = await this.gameRooms.createRoom(userId, {
            id: userId,
            openid: user.openid,
            nickname: user.nickname || '玩家',
            avatar: user.avatar || '',
            isReady: true,
            isHost: true,
            isAI: false,
            isHiddenLandlord: false
        }, roomType);
        client.roomCode = room.roomCode;
        client.playerIndex = 0;
        client.userId = userId;
        // 启用快速匹配模式，延长AI延迟
        room.setQuickMatchMode(true);
        // 调用 setupRoomListeners 以便发送游戏消息
        this.setupRoomListeners(room);
        // 根据房间类型获取玩家数量，动态添加AI（房主 + AI = 房间总人数 - 1个AI）
        const playerCount = (0, GameRoom_1.getPlayerCountByRoomType)(roomType);
        const aiCount = playerCount - 1; // 除了房主外都是AI
        const aiNames = ['小智', '小红', '小明', '小强', '小芳', '小刚', '小华', '小杰', '小丽', '小燕'];
        for (let i = 0; i < aiCount; i++) {
            const aiName = aiNames[i % aiNames.length];
            const result = room.addAI(i + 1, aiName);
            if (!result.success) {
                this.send(ws, { type: 'room/quick_match', data: { success: false, error: '添加AI失败: ' + result.error } });
                return;
            }
        }
        // 直接开始游戏（但不发消息给客户端，客户端已经有数据）
        const startResult = room.startGame();
        if (!startResult) {
            this.send(ws, { type: 'room/quick_match', data: { success: false, error: '开始游戏失败' } });
            return;
        }
        // 获取发牌数据
        const playerHand = room.getPlayerHand(0);
        const landlordCards = room.getLandlordCards();
        const landlordId = room.getLandlordId();
        // 确保数据有效
        if (!playerHand || playerHand.length === 0) {
            this.send(ws, { type: 'room/quick_match', data: { success: false, error: '发牌数据无效' } });
            return;
        }
        const dealtData = {
            hand: playerHand,
            landlordCards: landlordCards || [],
            landlordId: landlordId
        };
        this.send(ws, {
            type: 'room/quick_match',
            data: {
                success: true,
                room: {
                    id: room.roomId,
                    roomCode: room.roomCode,
                    type: room.roomType,
                    players: room.getPlayers()
                },
                dealt: dealtData
            }
        });
    }
    /** 处理再来一局（房间内重置游戏） */
    async handleRoomRestart(ws, client, room) {
        console.log(`[handleRoomRestart] roomCode=${client.roomCode}, playerIndex=${client.playerIndex}, userId=${client.userId}`);
        // 只有房主才能发起再来一局
        const players = room.getPlayers();
        const hostPlayer = players.find(p => p && p.isHost);
        console.log(`[handleRoomRestart] hostPlayer=${hostPlayer?.id}, client.userId=${client.userId}`);
        if (!hostPlayer || hostPlayer.id !== client.userId) {
            this.send(ws, { type: 'room/quick_match', data: { success: false, error: '只有房主才能发起再来一局' } });
            return;
        }
        // 重置游戏（重新发牌但不重新创建房间）
        console.log(`[handleRoomRestart] Calling restartGame()`);
        const startResult = room.restartGame ? room.restartGame() : false;
        console.log(`[handleRoomRestart] restartGame result: ${startResult}`);
        if (!startResult) {
            this.send(ws, { type: 'room/quick_match', data: { success: false, error: '重开游戏失败' } });
            return;
        }
        // 获取所有玩家的手牌
        const hands = [];
        const landlordCards = room.getLandlordCards();
        const landlordId = room.getLandlordId();
        const playerCount = room.getPlayers().length;
        for (let i = 0; i < playerCount; i++) {
            const playerHand = room.getPlayerHand(i);
            hands.push(playerHand || []);
        }
        // 获取发牌数据（房主的手牌，用于发送给房主）
        const hostHand = room.getPlayerHand(0);
        const dealtData = {
            hand: hostHand,
            landlordCards: landlordCards || [],
            landlordId: landlordId
        };
        // 向房主发送重启成功响应
        this.send(ws, {
            type: 'room/quick_match',
            data: {
                success: true,
                room: {
                    id: room.roomId,
                    roomCode: room.roomCode,
                    type: room.roomType,
                    players: room.getPlayers()
                },
                dealt: dealtData
            }
        });
        // 向房间内其他玩家广播游戏重启（通过game/dealt发送他们的手牌）
        for (const [clientWs, clientData] of this.clients.entries()) {
            if (clientData.roomCode === client.roomCode && clientWs !== ws) {
                const playerIndex = clientData.playerIndex;
                if (playerIndex !== null && playerIndex !== undefined) {
                    const playerHand = room.getPlayerHand(playerIndex);
                    const isLandlord = playerIndex === landlordId;
                    const handCards = isLandlord ? [...playerHand, ...landlordCards] : playerHand;
                    // 发送游戏重启数据
                    this.send(clientWs, {
                        type: 'room/quick_match',
                        data: {
                            success: true,
                            room: {
                                id: room.roomId,
                                roomCode: room.roomCode,
                                type: room.roomType,
                                players: room.getPlayers()
                            },
                            dealt: {
                                hand: handCards,
                                landlordCards: landlordCards || [],
                                landlordId: landlordId
                            }
                        }
                    });
                }
            }
        }
    }
    /** 开始游戏 */
    async handleStartGame(ws, client) {
        if (!client.roomCode)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 房主才能开始游戏
        const players = room.getPlayers();
        const hostPlayer = players.find(p => p && p.isHost);
        if (!hostPlayer || hostPlayer.id !== client.userId) {
            this.send(ws, { type: 'game/start', data: { success: false, error: '只有房主可以开始游戏' } });
            return;
        }
        // 检查所有人是否准备
        if (!room.allPlayersReady()) {
            this.send(ws, { type: 'game/start', data: { success: false, error: '还有玩家未准备' } });
            return;
        }
        const success = room.startGame();
        if (!success) {
            this.send(ws, { type: 'game/start', data: { success: false, error: '开始游戏失败' } });
        }
    }
    /** 处理出牌 */
    async handleGameAction(ws, client, data) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 验证是否是该玩家的回合
        if (room.getCurrentPlayerId() !== client.playerIndex) {
            this.send(ws, { type: 'game/action', data: { success: false, error: '不是你的回合' } });
            return;
        }
        // 空卡牌视为跳过
        if (!data.cards || data.cards.length === 0) {
            const result = room.pass(client.userId);
            if (!result.success) {
                this.send(ws, { type: 'game/action', data: { success: false, error: result.error } });
            }
            // 成功时，事件会通过 room listener 广播（player_passed）
            return;
        }
        const result = room.playCards(client.userId, data.cards);
        if (!result.success) {
            this.send(ws, { type: 'game/action', data: { success: false, error: result.error } });
        }
        // 成功时，事件会通过 room listener 广播
    }
    /** 处理跳过 */
    async handleGamePass(ws, client) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        if (room.getCurrentPlayerId() !== client.playerIndex) {
            this.send(ws, { type: 'game/pass', data: { success: false, error: '不是你的回合' } });
            return;
        }
        const result = room.pass(client.userId);
        if (!result.success) {
            this.send(ws, { type: 'game/pass', data: { success: false, error: result.error } });
        }
    }
    /** 处理明地主选择地主牌 */
    async handleLandlordCardsSelected(ws, client, data) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 验证是否是该玩家的回合（应该是明地主）
        if (room.getCurrentPlayerId() !== client.playerIndex) {
            this.send(ws, { type: 'game/landlord_cards_selected', data: { success: false, error: '不是你的回合' } });
            return;
        }
        const result = room.landlordCardsSelected(client.userId, data.cardId);
        if (!result.success) {
            this.send(ws, { type: 'game/landlord_cards_selected', data: { success: false, error: result.error } });
        }
        // 成功时，事件会通过 room listener 广播
    }
    /** 处理客户端准备就绪（动画播放完成） */
    async handleGameReady(ws, client) {
        if (!client.roomCode || client.playerIndex === null)
            return;
        const room = this.gameRooms.findByRoomCode(client.roomCode);
        if (!room)
            return;
        // 检查游戏状态
        const status = room.status;
        const waitingForClientReady = room.waitingForClientReady;
        // 如果游戏已经开始（status === 'playing'），说明是晚加入的客户端
        if (status === 'playing') {
            // 晚客户端：发送当前游戏状态，然后直接发送当前的 turn
            const hands = room.hands;
            const landlordId = room.landlordId;
            const hiddenLandlordIds = room.hiddenLandlordIds;
            const landlordCards = room.landlordCards;
            const playerIndex = client.playerIndex;
            // 向该玩家发送他们的手牌
            const playerHand = hands[playerIndex]?.cards || [];
            const isLandlord = playerIndex === landlordId;
            const handCards = isLandlord ? [...playerHand, ...landlordCards] : playerHand;
            this.send(ws, {
                type: 'game/dealt',
                data: {
                    hand: handCards,
                    landlordCards: landlordCards,
                    landlordId: landlordId,
                    hiddenLandlordIds: hiddenLandlordIds || []
                }
            });
            // 发送地主选择结果（仅当地主牌已选择时，即 landlordCardId > 0）
            // 在6人场，如果AI还未选择地主牌，landlordCardId=-1，此时不发送 landlord_selected
            const landlordCardId = room.landlordCardId;
            if (landlordId >= 0 && landlordCardId > 0) {
                this.send(ws, {
                    type: 'game/landlord_selected',
                    data: { landlordId, hiddenLandlordIds: hiddenLandlordIds || [], landlordCardId }
                });
            }
            // 直接发送当前回合（不通过 clientReady 广播）
            const currentPlayerId = room.currentPlayerId;
            this.send(ws, {
                type: 'game/turn',
                data: { playerId: currentPlayerId }
            });
            // 标记该客户端已收到 turn
            client.turnNotified = true;
            console.log(`[handleGameReady] Late client, sent game/turn directly, playerIndex=${playerIndex}, currentPlayerId=${currentPlayerId}`);
            return;
        }
        // 游戏还在发牌阶段（status === 'dealing'），正常流程
        // 只有在等待客户端准备时才发送 game/dealt（首次发牌动画播放中）
        // restartGame() 之后 waitingForClientReady 已被设为 false，不重复发送
        if (!waitingForClientReady) {
            console.log(`[handleGameReady] waitingForClientReady=false, skipping game/dealt`);
            return;
        }
        // hands 是 Hand[] 数组，每个 Hand 有一个 cards 属性
        const hands = room.hands;
        console.log(`[handleGameReady] hands check:`, hands, 'length:', hands?.length, 'hand[0].cards:', hands?.[0]?.cards?.length);
        if (hands && hands.length > 0 && hands[0]?.cards?.length > 0) {
            const landlordId = room.landlordId;
            const hiddenLandlordIds = room.hiddenLandlordIds;
            const landlordCards = room.landlordCards;
            const playerIndex = client.playerIndex;
            // 向该玩家发送他们的手牌
            const playerHand = hands[playerIndex]?.cards || [];
            const isLandlord = playerIndex === landlordId;
            const handCards = isLandlord ? [...playerHand, ...landlordCards] : playerHand;
            this.send(ws, {
                type: 'game/dealt',
                data: {
                    hand: handCards,
                    landlordCards: landlordCards,
                    landlordId: landlordId,
                    hiddenLandlordIds: hiddenLandlordIds || []
                }
            });
            // 发送地主选择结果（仅当地主牌已选择时，即 landlordCardId > 0）
            // 在6人场，如果AI还未选择地主牌，landlordCardId=-1，此时不发送 landlord_selected
            const landlordCardId = room.landlordCardId;
            if (landlordId >= 0 && landlordCardId > 0) {
                this.send(ws, {
                    type: 'game/landlord_selected',
                    data: { landlordId, hiddenLandlordIds: hiddenLandlordIds || [], landlordCardId }
                });
            }
        }
        // 只有在等待客户端准备时才调用 clientReady（首次发牌后的等待）
        if (waitingForClientReady && !room.turnNotified) {
            room.clientReady();
            client.turnNotified = true;
        }
    }
    /** 设置房间事件监听 */
    setupRoomListeners(room) {
        // 防止重复监听
        if (room._listenersSet)
            return;
        room._listenersSet = true;
        room.on('game_start', () => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/start',
                data: { success: true }
            });
        });
        room.on('game_dealt', (data) => {
            // 向每个玩家发送他们的手牌
            const players = room.getPlayers();
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                if (player) {
                    const ws = this.getClientWsByUserId(player.id);
                    if (ws) {
                        // 每个人看到的手牌不同：地主看到20张，其他人看到17张
                        const handCards = (i === data.landlordId)
                            ? [...data.hands[i], ...data.landlordCards]
                            : data.hands[i];
                        this.send(ws, {
                            type: 'game/dealt',
                            data: {
                                hand: handCards,
                                landlordCards: data.landlordCards,
                                landlordId: data.landlordId,
                                hiddenLandlordIds: data.hiddenLandlordIds || []
                            }
                        });
                    }
                }
            }
        });
        room.on('landlord_selected', (data) => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/landlord_selected',
                data: { landlordId: data.landlordId, hiddenLandlordIds: data.hiddenLandlordIds, landlordCardId: data.landlordCardId, landlordCardSuit: data.landlordCardSuit, landlordCardRank: data.landlordCardRank }
            });
        });
        room.on('turn_changed', (playerId) => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/turn',
                data: { playerId }
            });
        });
        room.on('cards_played', (data) => {
            console.log(`[BROADCAST cards_played] playerId=${data.playerId}, cards=${data.cards.map((c) => `${c.id}(rank${c.rank})`).join(',')}, pattern=${data.pattern}`);
            this.broadcastToRoom(room.roomCode, {
                type: 'game/action',
                data: {
                    playerId: data.playerId,
                    cards: data.cards, // 发送完整的卡牌对象
                    pattern: data.pattern, // 发送牌型信息
                    actionType: 'play'
                }
            });
        });
        room.on('player_passed', (playerId) => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/action',
                data: {
                    playerId,
                    cards: [],
                    actionType: 'pass'
                }
            });
        });
        room.on('round_cleared', () => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/round_cleared',
                data: {}
            });
        });
        room.on('game_over', (result) => {
            this.broadcastToRoom(room.roomCode, {
                type: 'game/over',
                data: result
            });
        });
        room.on('player_disconnected', (playerIndex) => {
            this.broadcastToRoom(room.roomCode, {
                type: 'room/player_disconnected',
                data: { playerIndex }
            });
        });
    }
    /** 处理断开连接 */
    async handleDisconnect(ws) {
        const client = this.clients.get(ws);
        if (client) {
            if (client.roomCode) {
                await this.handleLeaveRoom(ws, client);
            }
            this.clients.delete(ws);
        }
    }
    /** 根据用户ID查找客户端WebSocket */
    getClientWsByUserId(userId) {
        for (const [, client] of this.clients.entries()) {
            if (client.userId === userId) {
                return client.ws;
            }
        }
        return undefined;
    }
    /** 发送消息给单个客户端 */
    send(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    /** 广播消息给房间内所有玩家 */
    broadcastToRoom(roomCode, message, excludeWs) {
        for (const [ws, client] of this.clients.entries()) {
            if (client.roomCode === roomCode && ws !== excludeWs) {
                this.send(ws, message);
            }
        }
    }
}
exports.WebSocketHandler = WebSocketHandler;
exports.wsHandler = new WebSocketHandler();
//# sourceMappingURL=WebSocketHandler.js.map