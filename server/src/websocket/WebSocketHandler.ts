import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { GameRoomManager } from '../game/GameRoomManager';
import { GameRoom } from '../game/GameRoom';
import { Card } from '../game/types';
import { userService } from '../services/UserService';

interface WSMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

interface WSClient {
  ws: WebSocket;
  userId: number;
  nickname: string;
  roomCode: string | null;
  playerIndex: number | null;
  turnNotified: boolean; // 该客户端是否已收到 game/turn
  clientReady: boolean; // 该客户端是否已发送 game/ready
  lateClient: boolean; // 该客户端是否是晚加入的（游戏已经开始后加入）
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, WSClient> = new Map();
  private gameRooms: GameRoomManager = new GameRoomManager();

  initialize(server: any): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {

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

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
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
  private async handleMessage(ws: WebSocket, message: WSMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

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

      case 'heartbeat':
        this.send(ws, { type: 'heartbeat' });
        break;

      default:
    }
  }

  /** 认证 */
  private async handleAuth(ws: WebSocket, client: WSClient, data: { userId?: number, nickname?: string }): Promise<void> {
    // 如果没有userId，生成一个临时的（用于测试）
    if (!data.userId) {
      data.userId = Math.floor(Math.random() * 10000) + 1;
    }
    client.userId = data.userId;
    client.nickname = data.nickname || `Player${client.userId}`;
    this.send(ws, { type: 'auth', data: { success: true, userId: client.userId } });
  }

  /** 创建房间 */
  private async handleCreateRoom(ws: WebSocket, client: WSClient, data: { userId: number, roomType?: number }): Promise<void> {
    try {
      const userId = data.userId;

      // 尝试获取用户信息，如果不存在则创建一个测试用户
      let user = await userService.findById(userId);
      if (!user) {
        // 创建测试用户
        user = await userService.findOrCreateByOpenid(
          `test_${userId}`,
          `玩家${userId}`,
          ''
        );
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
        isAI: false
      });

      client.roomCode = room.roomCode;
      client.playerIndex = 0; // 房主是位置0
      client.userId = userId; // 设置用户ID

      // 更新用户房间ID
      await userService.updateRoomId(userId, room.roomId);

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
            type: data.roomType || 1,
            players: players
          }
        }
      });

      // 广播房间更新（不排除任何人，因为房间刚创建）
      this.broadcastToRoom(room.roomCode, {
        type: 'room/players_update',
        data: { players: players }
      });
    } catch (error) {
      console.error('[WebSocket] handleCreateRoom error:', error);
      this.send(ws, { type: 'room/create', data: { success: false, error: '创建房间失败' } });
    }
  }

  /** 加入房间 */
  private async handleJoinRoom(ws: WebSocket, client: WSClient, data: { roomCode: string, userId: number }): Promise<void> {
    try {
      const { roomCode, userId } = data;

      const room = this.gameRooms.findByRoomCode(roomCode);
      if (!room) {
        this.send(ws, { type: 'room/join', data: { success: false, error: '房间不存在' } });
        return;
      }

      if (room.getStatus() !== 'waiting') {
        this.send(ws, { type: 'room/join', data: { success: false, error: '房间已开始游戏' } });
        return;
      }

      // 获取用户信息，如果不存在则创建测试用户
      let user = await userService.findById(userId);
      if (!user) {
        user = await userService.findOrCreateByOpenid(
          `test_${userId}`,
          `玩家${userId}`,
          ''
        );
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
        isAI: false
      });

      if (!result) {
        this.send(ws, { type: 'room/join', data: { success: false, error: '房间已满' } });
        return;
      }

      client.roomCode = roomCode;
      client.playerIndex = result.position;
      client.userId = userId; // 设置用户ID

      await userService.updateRoomId(userId, room.roomId);

      // 确保房间事件已监听
      this.setupRoomListeners(room);

      this.send(ws, {
        type: 'room/join',
        data: {
          success: true,
          room: {
            id: room.roomId,
            roomCode: room.roomCode,
            type: 1,
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
    } catch (error) {
      console.error('[WebSocket] handleJoinRoom error:', error);
      this.send(ws, { type: 'room/join', data: { success: false, error: '加入房间失败' } });
    }
  }

  /** 离开房间 */
  private async handleLeaveRoom(ws: WebSocket, client: WSClient): Promise<void> {
    if (!client.roomCode || client.playerIndex === null) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

    const playerId = client.userId;
    const playerIndex = client.playerIndex;
    room.removePlayer(playerId);

    this.broadcastToRoom(client.roomCode, {
      type: 'room/player_leave',
      data: { playerIndex, players: room.getPlayers() }
    });

    client.roomCode = null;
    client.playerIndex = null;
  }

  /** 玩家准备 */
  private async handlePlayerReady(ws: WebSocket, client: WSClient, data: { ready: boolean }): Promise<void> {
    if (!client.roomCode || client.playerIndex === null) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

    room.setPlayerReady(client.userId, data.ready);

    this.broadcastToRoom(client.roomCode, {
      type: 'room/player_ready',
      data: { playerIndex: client.playerIndex, ready: data.ready, players: room.getPlayers() }
    });
  }

  /** 添加AI */
  private async handleAddAI(ws: WebSocket, client: WSClient, data: { position?: number }): Promise<void> {
    if (!client.roomCode) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

    // 检查是否是房主
    const players = room.getPlayers();
    const hostPlayer = players.find(p => p && p.isHost);
    if (!hostPlayer || hostPlayer.id !== client.userId) {
      this.send(ws, { type: 'room/add_ai', data: { success: false, error: '只有房主可以添加AI' } });
      return;
    }

    const targetPosition = data.position ?? -1;
    const aiNames = ['小智', '小红', '小明', '小强', '小芳', '小刚'];
    const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];

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
  private async handleRemoveAI(ws: WebSocket, client: WSClient, data: { position: number }): Promise<void> {
    if (!client.roomCode) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

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
  private async handleQuickMatch(ws: WebSocket, client: WSClient, data?: { userId?: number }): Promise<void> {
    const userId = data?.userId ?? client.userId;

    // 如果客户端已在房间中（再来一局），则重置现有房间的游戏
    if (client.roomCode) {
      const existingRoom = this.gameRooms.findByRoomCode(client.roomCode);
      if (existingRoom) {
        await this.handleRoomRestart(ws, client, existingRoom);
        return;
      }
    }

    // 获取或创建用户
    let user = await userService.findById(userId);
    if (!user) {
      user = await userService.findOrCreateByOpenid(
        `test_${userId}`,
        `玩家${userId}`,
        ''
      );
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
      isAI: false
    });

    client.roomCode = room.roomCode;
    client.playerIndex = 0;
    client.userId = userId;

    // 启用快速匹配模式，延长AI延迟
    room.setQuickMatchMode(true);

    // 调用 setupRoomListeners 以便发送游戏消息
    this.setupRoomListeners(room);

    // 添加两个AI
    const aiNames = ['小智', '小明'];
    for (let i = 0; i < 2; i++) {
      const result = room.addAI(i + 1, aiNames[i]);
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
          type: 1,
          players: room.getPlayers()
        },
        dealt: dealtData
      }
    });
  }

  /** 处理再来一局（房间内重置游戏） */
  private async handleRoomRestart(ws: WebSocket, client: WSClient, room: GameRoom): Promise<void> {
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
    const startResult = (room as any).restartGame ? room.restartGame() : false;
    console.log(`[handleRoomRestart] restartGame result: ${startResult}`);
    if (!startResult) {
      this.send(ws, { type: 'room/quick_match', data: { success: false, error: '重开游戏失败' } });
      return;
    }

    // 获取所有玩家的手牌
    const hands: Card[][] = [];
    const landlordCards = room.getLandlordCards();
    const landlordId = room.getLandlordId();

    for (let i = 0; i < 3; i++) {
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
          id: (room as any).roomId,
          roomCode: (room as any).roomCode,
          type: 1,
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
                id: (room as any).roomId,
                roomCode: (room as any).roomCode,
                type: 1,
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
  private async handleStartGame(ws: WebSocket, client: WSClient): Promise<void> {
    if (!client.roomCode) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

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
  private async handleGameAction(ws: WebSocket, client: WSClient, data: { cards?: number[] }): Promise<void> {
    if (!client.roomCode || client.playerIndex === null) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

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
  private async handleGamePass(ws: WebSocket, client: WSClient): Promise<void> {
    if (!client.roomCode || client.playerIndex === null) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

    if (room.getCurrentPlayerId() !== client.playerIndex) {
      this.send(ws, { type: 'game/pass', data: { success: false, error: '不是你的回合' } });
      return;
    }

    const result = room.pass(client.userId);

    if (!result.success) {
      this.send(ws, { type: 'game/pass', data: { success: false, error: result.error } });
    }
  }

  /** 处理客户端准备就绪（动画播放完成） */
  private async handleGameReady(ws: WebSocket, client: WSClient): Promise<void> {
    if (!client.roomCode || client.playerIndex === null) return;

    const room = this.gameRooms.findByRoomCode(client.roomCode);
    if (!room) return;

    // 检查游戏状态
    const status = (room as any).status as string;
    const waitingForClientReady = (room as any).waitingForClientReady as boolean;

    // 如果游戏已经开始（status === 'playing'），说明是晚加入的客户端
    if (status === 'playing') {
      // 晚客户端：发送当前游戏状态，然后直接发送当前的 turn
      const hands = (room as any).hands;
      const landlordId = (room as any).landlordId as number;
      const landlordCards = (room as any).landlordCards as Card[];
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
          landlordId: landlordId
        }
      });

      // 发送地主选择结果
      if (landlordId >= 0) {
        this.send(ws, {
          type: 'game/landlord_selected',
          data: { landlordId }
        });
      }

      // 直接发送当前回合（不通过 clientReady 广播）
      const currentPlayerId = (room as any).currentPlayerId as number;
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
    // hands 是 Hand[] 数组，每个 Hand 有一个 cards 属性
    const hands = (room as any).hands;
    console.log(`[handleGameReady] hands check:`, hands, 'length:', hands?.length, 'hand[0].cards:', hands?.[0]?.cards?.length);
    if (hands && hands.length > 0 && hands[0]?.cards?.length > 0) {
      const landlordId = (room as any).landlordId as number;
      const landlordCards = (room as any).landlordCards as Card[];
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
          landlordId: landlordId
        }
      });

      // 发送地主选择结果
      if (landlordId >= 0) {
        this.send(ws, {
          type: 'game/landlord_selected',
          data: { landlordId }
        });
      }
    }

    // 只有在等待客户端准备时才调用 clientReady（首次发牌后的等待）
    if (waitingForClientReady && !(room as any).turnNotified) {
      room.clientReady();
      client.turnNotified = true;
    }
  }

  /** 设置房间事件监听 */
  private setupRoomListeners(room: GameRoom): void {
    // 防止重复监听
    if ((room as any)._listenersSet) return;
    (room as any)._listenersSet = true;

    room.on('game_start', () => {
      this.broadcastToRoom(room.roomCode, {
        type: 'game/start',
        data: { success: true }
      });
    });

    room.on('game_dealt', (data: { hands: any[], landlordCards: any[], landlordId: number }) => {
      // 向每个玩家发送他们的手牌
      const players = room.getPlayers();
      for (let i = 0; i < 3; i++) {
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
                landlordId: data.landlordId
              }
            });
          }
        }
      }
    });

    room.on('landlord_selected', (landlordId: number) => {
      this.broadcastToRoom(room.roomCode, {
        type: 'game/landlord_selected',
        data: { landlordId }
      });
    });

    room.on('turn_changed', (playerId: number) => {
      this.broadcastToRoom(room.roomCode, {
        type: 'game/turn',
        data: { playerId }
      });
    });

    room.on('cards_played', (data: { playerId: number, cards: any[] }) => {
      console.log(`[BROADCAST cards_played] playerId=${data.playerId}, cards=${data.cards.map((c: any) => `${c.id}(rank${c.rank})`).join(',')}`);
      this.broadcastToRoom(room.roomCode, {
        type: 'game/action',
        data: {
          playerId: data.playerId,
          cards: data.cards, // 发送完整的卡牌对象
          actionType: 'play'
        }
      });
    });

    room.on('player_passed', (playerId: number) => {
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

    room.on('game_over', (result: { winnerId: number, isLandlordWin: boolean }) => {
      this.broadcastToRoom(room.roomCode, {
        type: 'game/over',
        data: result
      });
    });

    room.on('player_disconnected', (playerIndex: number) => {
      this.broadcastToRoom(room.roomCode, {
        type: 'room/player_disconnected',
        data: { playerIndex }
      });
    });
  }

  /** 处理断开连接 */
  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const client = this.clients.get(ws);
    if (client) {
      if (client.roomCode) {
        await this.handleLeaveRoom(ws, client);
      }
      this.clients.delete(ws);
    }
  }

  /** 根据用户ID查找客户端WebSocket */
  private getClientWsByUserId(userId: number): WebSocket | undefined {
    for (const [, client] of this.clients.entries()) {
      if (client.userId === userId) {
        return client.ws;
      }
    }
    return undefined;
  }

  /** 发送消息给单个客户端 */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /** 广播消息给房间内所有玩家 */
  private broadcastToRoom(roomCode: string, message: WSMessage, excludeWs?: WebSocket): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomCode === roomCode && ws !== excludeWs) {
        this.send(ws, message);
      }
    }
  }
}

export const wsHandler = new WebSocketHandler();
