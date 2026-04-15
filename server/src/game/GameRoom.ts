/**
 * 游戏房间 - 服务端游戏状态管理
 */

import { Card, GamePlayer, GameStatus, GameOverResult, Move, PatternResult, CardPatternType } from './types';
import { createDeck, shuffle, deal } from './Deck';
import { GameRules, Hand } from './GameRules';
import { GameRules2, Hand2 } from './GameRules2';
import { EventEmitter } from 'events';

/** 房间类型配置 */
const ROOM_CONFIG: Record<number, {
    playerCount: number;     // 玩家数量
    deckCount: number;      // 牌组数量
    cardsPerPlayer: number;  // 每人手牌数量
    landlordCards: number;  // 地主牌数量
}> = {
    1: { playerCount: 3, deckCount: 1, cardsPerPlayer: 17, landlordCards: 3 },   // 三人斗地主
    2: { playerCount: 4, deckCount: 2, cardsPerPlayer: 27, landlordCards: 0 }, // 四人斗地主
    3: { playerCount: 5, deckCount: 2, cardsPerPlayer: 21, landlordCards: 3 }, // 五人斗地主
    4: { playerCount: 6, deckCount: 3, cardsPerPlayer: 27, landlordCards: 0 },  // 六人斗地主
    5: { playerCount: 7, deckCount: 3, cardsPerPlayer: 23, landlordCards: 1 },   // 七人斗地主
};

/** 获取房间类型对应的玩家数量 */
export function getPlayerCountByRoomType(roomType: number): number {
    return ROOM_CONFIG[roomType]?.playerCount || 3;
}

/** 获取房间类型对应的牌组数量 */
export function getDeckCountByRoomType(roomType: number): number {
    return ROOM_CONFIG[roomType]?.deckCount || 1;
}

/** 获取房间类型对应的每人手牌数量 */
export function getCardsPerPlayerByRoomType(roomType: number): number {
    return ROOM_CONFIG[roomType]?.cardsPerPlayer || 17;
}

/** 获取房间类型对应的底牌数量 */
export function getLandlordCardsByRoomType(roomType: number): number {
    return ROOM_CONFIG[roomType]?.landlordCards || 3;
}

/** 是否为6人场（需要暗地主选择） */
function isSixPlayerMode(roomType: number): boolean {
    return roomType === 4;
}

/** AI 玩家名字列表 */
const AI_NAMES = ['小智', '小红', '小刚', '小明', '小华', '小杰', '小丽', '小强', '小芳', '小军', '小雨', '小燕', '小涛', '小梅', '小兵', '小燕'];

/** AI 玩家头像 */
const AI_AVATAR = 'test';

export type GameRoomEventType =
    | 'player_ready'
    | 'player_unready'
    | 'game_start'
    | 'game_dealt'
    | 'landlord_selected'
    | 'turn_changed'
    | 'cards_played'
    | 'player_passed'
    | 'round_cleared'
    | 'game_over'
    | 'player_disconnected';

export interface GameRoomEvents {
    player_ready: (playerId: number) => void;
    player_unready: (playerId: number) => void;
    game_start: () => void;
    game_dealt: (data: { hands: Card[][], landlordCards: Card[], landlordId: number }) => void;
    landlord_selected: (data: { landlordId: number, hiddenLandlordIds: number[], landlordCardId: number }) => void;
    turn_changed: (playerId: number) => void;
    cards_played: (data: { playerId: number, cards: Card[], pattern: PatternResult }) => void;
    player_passed: (playerId: number) => void;
    round_cleared: () => void;
    game_over: (result: GameOverResult) => void;
    player_disconnected: (playerId: number) => void;
}

export class GameRoom extends EventEmitter {
    public readonly roomCode: string;
    public readonly roomId: number;
    public readonly roomType: number;
    public readonly gameType: number;
    private players: (GamePlayer | null)[] = [null, null, null];
    private status: GameStatus = 'waiting';
    private landlordId: number = -1;
    private hiddenLandlordIds: number[] = []; // 暗地主ID数组（6人场有2个暗地主）
    private landlordCards: Card[] = [];
    private landlordCardId: number = -1;  // 地主选择的代表性地主牌ID
    private hands: Hand[] = [new Hand(), new Hand(), new Hand()];
    private currentPlayerId: number = 0;
    private lastMove: Move | null = null;
    private roundStartPlayerId: number = 0;
    private passedPlayers: Set<number> = new Set(); // 记录本轮跳过过的玩家
    private aiTimers: NodeJS.Timeout[] = [];
    private quickMatchMode: boolean = false; // 快速匹配模式，不运行AI
    private scheduledPlayerId: number = -1; // 记录当前调度的AI玩家ID（位置索引）
    private waitingForClientReady: boolean = false; // 等待客户端动画播放完成
    private turnNotified: boolean = false; // 是否已经发送过 turn_changed（防止重复发送）
    private firstMoveDone: boolean = false; // 是否已完成首轮出牌（用于调整AI延迟）
    // 6人斗地主已出完牌的计数
    private finishedFarmerCount: number = 0;   // 农民方已出完的人数（3人场用）

    constructor(roomCode: string, roomId: number, roomType: number = 1, gameType: number = 1) {
        super();
        this.roomCode = roomCode;
        this.roomId = roomId;
        this.roomType = roomType;
        this.gameType = gameType;
        // 根据房间类型初始化玩家数组
        const playerCount = getPlayerCountByRoomType(roomType);
        this.players = new Array(playerCount).fill(null);
        this.hands = Array.from({ length: playerCount }, () => new Hand());
    }

    /** 设置快速匹配模式 */
    setQuickMatchMode(enabled: boolean): void {
        this.quickMatchMode = enabled;
    }

    /** 添加玩家到房间 */
    addPlayer(player: Omit<GamePlayer, 'hand' | 'isLandlord' | 'isHiddenLandlord'>): number | null {
        for (let i = 0; i < this.players.length; i++) {
            if (!this.players[i]) {
                this.players[i] = {
                    ...player,
                    hand: [],
                    isLandlord: false,
                    isHiddenLandlord: false
                };
                return i;
            }
        }
        return null;
    }

    /** 移除玩家 */
    removePlayer(playerId: number): void {
        const index = this.players.findIndex(p => p && p.id === playerId);
        if (index !== -1) {
            this.players[index] = null;
            this.emit('player_disconnected', index);
        }
    }

    /** 添加AI玩家 */
    addAI(targetPosition: number = -1, nickname: string = 'AI'): { success: boolean, position?: number, error?: string } {
        let position = targetPosition;
        const maxPlayers = this.players.length;

        // 如果没有指定位置，找第一个空位
        if (position < 0 || position >= maxPlayers) {
            position = this.players.findIndex(p => p === null);
        }

        // 检查位置是否有效
        if (position < 0 || position >= maxPlayers || this.players[position] !== null) {
            return { success: false, error: '没有空位' };
        }

        // 检查房间状态
        if (this.status !== 'waiting') {
            return { success: false, error: '游戏已经开始，无法添加AI' };
        }

        // 生成唯一的AI ID（使用负数 + 位置，避免时间戳冲突）
        const aiId = -(1000000 + position + Math.floor(Math.random() * 1000));

        // 添加AI
        // 如果没有提供昵称，随机生成一个（确保不重复）
        if (!nickname || nickname === 'AI') {
            // 获取当前已使用的AI名字
            const usedNames = this.players
                .filter(p => p && p.isAI && p.nickname)
                .map(p => p!.nickname);
            // 从未使用的名字中随机选择
            const availableNames = AI_NAMES.filter(n => !usedNames.includes(n));
            if (availableNames.length > 0) {
                nickname = availableNames[Math.floor(Math.random() * availableNames.length)];
            } else {
                nickname = `AI${position}`;
            }
        }
        const aiAvatar = AI_AVATAR;
        const aiPlayer: GamePlayer = {
            id: aiId,
            openid: `ai_${aiId}`,
            nickname: nickname,
            avatar: aiAvatar,
            isReady: true, // AI默认准备
            isHost: false,
            isAI: true,
            hand: [],
            isLandlord: false,
            isHiddenLandlord: false
        };

        this.players[position] = aiPlayer;

        return { success: true, position };
    }

    /** 移除AI玩家 */
    removeAI(position: number): { success: boolean, error?: string } {
        // 检查位置是否有效
        if (position < 0 || position >= this.players.length) {
            return { success: false, error: '位置无效' };
        }

        const player = this.players[position];
        if (!player) {
            return { success: false, error: '该位置没有玩家' };
        }

        // 检查是否是AI
        if (!player.isAI) {
            return { success: false, error: '只能移除AI玩家' };
        }

        // 检查房间状态
        if (this.status !== 'waiting') {
            return { success: false, error: '游戏已经开始，无法移除AI' };
        }

        this.players[position] = null;

        return { success: true };
    }

    /** 获取玩家位置索引 */
    getPlayerIndex(playerId: number): number {
        return this.players.findIndex(p => p && p.id === playerId);
    }

    /** 玩家准备 */
    setPlayerReady(playerId: number, ready: boolean): void {
        const index = this.getPlayerIndex(playerId);
        if (index !== -1 && this.players[index]) {
            this.players[index]!.isReady = ready;
            this.emit(ready ? 'player_ready' : 'player_unready', index);
        }
    }

    /** 检查是否所有人都准备好了 */
    allPlayersReady(): boolean {
        return this.players.every(p => p !== null && p.isReady);
    }

    /** 检查是否有空位 */
    hasEmptySlot(): boolean {
        return this.players.some(p => p === null);
    }

    /** 获取真实玩家数量 */
    getPlayerCount(): number {
        return this.players.filter(p => p !== null).length;
    }

    /** 玩家是否都在场 */
    allPlayersPresent(): boolean {
        return this.players.every(p => p !== null);
    }

    /** 开始游戏 */
    startGame(): boolean {
        if (this.status !== 'waiting') {
            return false;
        }

        if (!this.allPlayersPresent()) {
            return false;
        }

        if (!this.allPlayersReady()) {
            return false;
        }

        this.status = 'dealing';
        this.turnNotified = false; // 重置回合通知标志
        this.firstMoveDone = false; // 重置首轮标志
        this.emit('game_start');
        this.dealCards();
        return true;
    }

    /** 重开游戏（游戏结束后再来一局） */
    restartGame(): boolean {
        // 只允许在游戏结束后重开
        if (this.status !== 'ended' && this.status !== 'playing') {
            console.log(`[restartGame] Cannot restart, status=${this.status}`);
            return false;
        }

        console.log(`[restartGame] Restarting game, current status=${this.status}`);

        // 重置游戏状态
        this.status = 'dealing';
        this.turnNotified = false;
        this.firstMoveDone = false;
        this.lastMove = null;
        this.passedPlayers.clear();
        this.currentPlayerId = this.landlordId; // 从地主开始

        // 重置玩家手牌为新的空Hand实例
        this.hands = Array.from({ length: this.players.length }, () => new Hand());

        // 等待客户端准备就绪（必须在地主选牌之前收到clientReady）
        this.waitingForClientReady = true;

        // 重新发牌（dealCards内部会发送game_dealt和landlord_selected事件）
        this.dealCards();

        console.log(`[restartGame] Game restarted, landlordId=${this.landlordId}, currentPlayerId=${this.currentPlayerId}`);
        return true;
    }

    /** 发牌 */
    private dealCards(): void {
        // 重置游戏计数
        this.finishedFarmerCount = 0;

        console.log(`[dealCards] roomType=${this.roomType}, isSixPlayerMode=${isSixPlayerMode(this.roomType)}, playerCount=${this.players.length}`);
        const deckCount = getDeckCountByRoomType(this.roomType);
        const cardsPerPlayer = getCardsPerPlayerByRoomType(this.roomType);

        const deck = shuffle(createDeck(deckCount));
        const playerCount = this.players.length;
        // 动态生成发牌数量数组
        const dealAmounts = new Array(playerCount).fill(cardsPerPlayer);
        const hands = deal(deck, dealAmounts);

        // 随机选择明地主
        this.landlordId = Math.floor(Math.random() * playerCount);
        this.hiddenLandlordIds = []; // 暂时清空，等待明地主选择地主牌后再确定
        this.landlordCards = hands[playerCount];

        // 设置玩家手牌
        for (let i = 0; i < playerCount; i++) {
            this.hands[i] = new Hand(hands[i]);
            this.players[i]!.hand = hands[i];
            this.players[i]!.isLandlord = (i === this.landlordId);
            this.players[i]!.isHiddenLandlord = false;
        }

        // 地主获得地主牌（6人场无底牌）
        if (this.landlordCards.length > 0) {
            this.hands[this.landlordId].addCards(this.landlordCards);
            this.players[this.landlordId]!.hand = this.hands[this.landlordId].cards;
        }

        // 打印所有玩家手牌
        for (let i = 0; i < playerCount; i++) {
            const cardIds = this.hands[i].cards.map(c => c.id);
            let role = i === this.landlordId ? '明地主' : '农民';
            console.log(`[DEALT] Player${i}(${role}) hand: ${cardIds.join(',')} (${this.hands[i].cards.length}张)`);
        }

        // 6人场：先发送发牌数据，让客户端播放发牌动画
        // 动画完成后客户端发送 game/ready，然后进入选择地主牌阶段
        if (isSixPlayerMode(this.roomType)) {
            console.log(`[dealCards] 6人场，发送 game_dealt 让客户端播放发牌动画`);

            // 发送发牌数据（只发送明牌，暗地主牌等选择完再更新）
            this.emit('game_dealt', {
                hands: this.hands.map(h => h.cards),
                landlordCards: this.landlordCards,
                landlordId: this.landlordId,
                hiddenLandlordIds: this.hiddenLandlordIds
            });

            // 等待客户端发牌动画完成
            this.waitingForClientReady = true;

            return; // 客户端动画完成后发送 game/ready，触发 clientReady() 再进入选择地主牌阶段
        }

        // 快速匹配模式下：发送数据后等待客户端动画完成
        // 客户端播放完发牌动画后发送 game/ready，服务器再开始回合
        if (this.quickMatchMode) {
            console.log(`[dealCards] emitting game_dealt: landlordId=${this.landlordId}, hiddenLandlordIds=${JSON.stringify(this.hiddenLandlordIds)}`);
            // 发送发牌数据
            this.emit('game_dealt', {
                hands: this.hands.map(h => h.cards),
                landlordCards: this.landlordCards,
                landlordId: this.landlordId,
                hiddenLandlordIds: this.hiddenLandlordIds
            });

            // 等待客户端准备就绪
            console.log(`[landlord_selected emit#1] landlordId=${this.landlordId}, hiddenIds=${JSON.stringify(this.hiddenLandlordIds)}, landlordCardId=-1`);
            this.emit('landlord_selected', { landlordId: this.landlordId, hiddenLandlordIds: this.hiddenLandlordIds, landlordCardId: -1 });
            this.status = 'dealing';
            this.currentPlayerId = this.landlordId;
            this.roundStartPlayerId = this.landlordId;
            this.waitingForClientReady = true;
        } else {
            this.emit('game_dealt', {
                hands: this.hands.map(h => h.cards),
                landlordCards: this.landlordCards,
                landlordId: this.landlordId,
                hiddenLandlordIds: this.hiddenLandlordIds
            });

            console.log(`[landlord_selected emit#2] landlordId=${this.landlordId}, hiddenIds=${JSON.stringify(this.hiddenLandlordIds)}, landlordCardId=-1`);
            this.emit('landlord_selected', { landlordId: this.landlordId, hiddenLandlordIds: this.hiddenLandlordIds, landlordCardId: -1 });

            // 开始出牌阶段
            this.status = 'playing';
            this.currentPlayerId = this.landlordId;
            this.roundStartPlayerId = this.landlordId;
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (game start, landlord)`);
            this.emit('turn_changed', this.currentPlayerId);
            // 如果是 AI，自动出牌
            this.scheduleAIMove();
        }
    }

    /** 明地主选择地主牌 */
    landlordCardsSelected(playerId: number, cardId: number): { success: boolean, error?: string } {
        const playerIndex = this.getPlayerIndex(playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }

        // 必须是明地主才能选择
        if (playerIndex !== this.landlordId) {
            return { success: false, error: 'Only landlord can select landlord cards' };
        }

        if (this.status !== 'selecting_landlord_cards') {
            return { success: false, error: 'Not in selecting landlord cards phase' };
        }

        // 查找选中的卡牌
        const selectedCard = this.hands[playerIndex].cards.find(c => c.id === cardId);
        if (!selectedCard) {
            return { success: false, error: 'Card not found in hand' };
        }

        console.log(`[landlordCardsSelected] 明地主${playerIndex}选择了地主牌: cardId=${cardId}, rank=${selectedCard.rank}, suit=${selectedCard.suit}`);

        // 确定暗地主：找出拥有相同rank和suit的其他玩家
        this.hiddenLandlordIds = [];
        for (let i = 0; i < this.players.length; i++) {
            if (i === this.landlordId) continue; // 跳过明地主
            const hasMatchingCard = this.hands[i].cards.some(c => c.rank === selectedCard.rank && c.suit === selectedCard.suit);
            if (hasMatchingCard) {
                this.hiddenLandlordIds.push(i);
            }
        }

        // 存储代表性地主牌ID
        this.landlordCardId = cardId;

        // 打印暗地主信息
        console.log(`[landlordCardsSelected] 确定暗地主: ${JSON.stringify(this.hiddenLandlordIds)}`);

        // 更新玩家身份
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i]) {
                this.players[i]!.isHiddenLandlord = this.hiddenLandlordIds.includes(i);
            }
        }

        // 发送 game_dealt（如果之前没有发送的话，6人场在选择阶段不发送 game_dealt）
        // 检查状态是否为 selecting_landlord_cards，如果是说明还没发送过 game_dealt
        const previousStatus = this.status;
        if (isSixPlayerMode(this.roomType) && previousStatus === 'selecting_landlord_cards') {
            // 发送 game_dealt 事件，让 WebSocketHandler 来发送数据给各玩家
            this.emit('game_dealt', {
                hands: this.hands.map(h => h.cards),
                landlordCards: this.landlordCards,
                landlordId: this.landlordId,
                hiddenLandlordIds: this.hiddenLandlordIds
            });
        }

        // 广播地主选择完成
        console.log(`[landlord_selected广播] landlordId=${this.landlordId}, hiddenLandlordIds=${JSON.stringify(this.hiddenLandlordIds)}, landlordCardId=${this.landlordCardId}`);
        this.emit('landlord_selected', {
            landlordId: this.landlordId,
            hiddenLandlordIds: this.hiddenLandlordIds,
            landlordCardId: this.landlordCardId,
            landlordCardSuit: selectedCard.suit,
            landlordCardRank: selectedCard.rank
        });

        // 进入出牌阶段
        this.status = 'playing';
        this.firstMoveDone = false;
        this.turnNotified = false;

        console.log(`[TURN] Player${this.currentPlayerId}'s turn (landlord selected, start playing)`);
        this.emit('turn_changed', this.currentPlayerId);

        // 如果是 AI，自动出牌
        this.scheduleAIMove();

        return { success: true };
    }

    /** 玩家出牌 */
    playCards(playerId: number, cardIds: number[]): { success: boolean, error?: string } {
                const playerIndex = this.getPlayerIndex(playerId);
                if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }

        if (this.currentPlayerId !== playerIndex) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.status !== 'playing') {
            return { success: false, error: 'Game not in playing state' };
        }

        // 查找卡牌
        const cards: Card[] = [];
        for (const id of cardIds) {
            const card = this.hands[playerIndex].cards.find(c => c.id === id);
            if (card) cards.push(card);
        }

                if (cards.length !== cardIds.length) {
            return { success: false, error: 'Some cards not found in hand' };
        }

        // 识别牌型
        let pattern;
        if (this.roomType === 4) {
            // 6人场使用GameRules2
            pattern = GameRules2.recognizePattern(cards);
        } else {
            pattern = GameRules.recognizePattern(cards);
        }

        // 创建出牌动作
        const move: Move = {
            cards,
            pattern,
            playerId: playerIndex
        };

        // 验证是否能压过上一手
        if (this.lastMove && this.lastMove.playerId !== playerIndex) {
            const canBeat = (this.roomType === 4)
                ? GameRules2.canBeat(move, this.lastMove)
                : GameRules.canBeat(move, this.lastMove);
            if (!canBeat) {
                return { success: false, error: 'Cannot beat last move' };
            }
        }

        // 执行出牌
        this.hands[playerIndex].removeCards(cards);
        this.lastMove = move;
        this.players[playerIndex]!.hand = this.hands[playerIndex].cards;
        this.passedPlayers.clear(); // 重置跳过记录，出牌后重新开始计算

        // 打印出牌信息
        const playedCardIds = cards.map(c => c.id);
        console.log(`[PLAY] Player${playerIndex} played: ${playedCardIds.join(',')} (${cards.length}张) ${pattern.type}, remaining: ${this.hands[playerIndex].cards.length}张`);

        // 打印所有玩家剩余手牌
        for (let i = 0; i < this.players.length; i++) {
            const remaining = this.hands[i].cards.map(c => c.id);
            console.log(`[HAND] Player${i}: ${remaining.join(',')} (${this.hands[i].cards.length}张)`);
        }

        this.emit('cards_played', {
            playerId: playerIndex,
            cards,
            pattern,
            remainingCounts: this.hands.map(h => h.cards.length)
        });

        // 检查游戏结束
        console.log(`[GAME_OVER CHECK] Player${playerIndex} hand empty: ${this.hands[playerIndex].isEmpty}, remaining: ${this.hands[playerIndex].cards.length}`);
        if (this.hands[playerIndex].isEmpty) {
            // 6人斗地主胜负判定
            if (this.roomType === 4) {
                // 明地主出完 -> 地主方赢
                if (playerIndex === this.landlordId) {
                    console.log(`[GAME_OVER] 明地主${playerIndex}出完，地主方获胜!`);
                    this.status = 'ended';
                    const { winnerNames, loserNames } = this.getWinnerAndLoserNames(true);
                    const result: GameOverResult = { winnerId: playerIndex, isLandlordWin: true, winnerNames, loserNames };
                    this.emit('game_over', result);
                    return { success: true };
                }
                // 暗地主出完，检查是否所有暗地主都已出完
                if (this.hiddenLandlordIds.includes(playerIndex)) {
                    const allHiddenLandlordsFinished = this.hiddenLandlordIds.every(
                        id => this.hands[id].isEmpty
                    );
                    if (allHiddenLandlordsFinished) {
                        console.log(`[GAME_OVER] 所有暗地主出完，地主方获胜!`);
                        this.status = 'ended';
                        const { winnerNames, loserNames } = this.getWinnerAndLoserNames(true);
                        const result: GameOverResult = { winnerId: playerIndex, isLandlordWin: true, winnerNames, loserNames };
                        this.emit('game_over', result);
                        return { success: true };
                    }
                }
                // 农民出完
                if (!this.hiddenLandlordIds.includes(playerIndex) && playerIndex !== this.landlordId) {
                    this.finishedFarmerCount++;
                    if (this.finishedFarmerCount >= 2) {
                        console.log(`[GAME_OVER] 2名农民出完，农民方获胜!`);
                        this.status = 'ended';
                        const { winnerNames, loserNames } = this.getWinnerAndLoserNames(false);
                        const result: GameOverResult = { winnerId: playerIndex, isLandlordWin: false, winnerNames, loserNames };
                        this.emit('game_over', result);
                        return { success: true };
                    }
                }
            } else {
                // 普通场（3人）胜负判定
                const isLandlordTeam = playerIndex === this.landlordId;
                console.log(`[GAME_OVER] Player${playerIndex} wins!`);
                this.status = 'ended';
                const { winnerNames, loserNames } = this.getWinnerAndLoserNames(isLandlordTeam);
                const result: GameOverResult = { winnerId: playerIndex, isLandlordWin: isLandlordTeam, winnerNames, loserNames };
                this.emit('game_over', result);
                return { success: true };
            }
        }

        // 检查是否一轮结束
        if (this.checkRoundClear()) {
            // 更新下一轮的起始玩家为最后出牌者
            this.roundStartPlayerId = this.lastMove ? this.lastMove.playerId : this.roundStartPlayerId;
            // 如果起始玩家没牌了，找下一个有牌的玩家
            if (this.hands[this.roundStartPlayerId].isEmpty) {
                this.roundStartPlayerId = this.getNextPlayerWithCards(this.roundStartPlayerId);
            }
            this.currentPlayerId = this.roundStartPlayerId;
            this.lastMove = null;
            this.passedPlayers.clear(); // 重置跳过记录
            this.emit('round_cleared');
            // 一轮结束后，由最后出牌者继续出牌
            this.turnNotified = false; // 重置通知标志
            console.log(`[TURN] Player${this.roundStartPlayerId}'s turn (last played)`);
            this.emit('turn_changed', this.roundStartPlayerId);
        } else {
            // 下一回合，跳过没有手牌的玩家
            this.currentPlayerId = this.getNextPlayerWithCards(this.currentPlayerId);
            this.turnNotified = false; // 重置通知标志
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (next)`);
            this.emit('turn_changed', this.currentPlayerId);
        }

        // 如果是 AI，自动出牌
        this.scheduleAIMove();

        return { success: true };
    }

    /** 获取下一个还有手牌的玩家索引 */
    private getNextPlayerWithCards(fromPlayerId: number): number {
        const playerCount = this.players.length;
        let nextPlayer = (fromPlayerId + 1) % playerCount;
        let attempts = 0;
        // 最多循环 playerCount 次，找到还有手牌的玩家
        while (this.hands[nextPlayer].isEmpty && attempts < playerCount) {
            nextPlayer = (nextPlayer + 1) % playerCount;
            attempts++;
        }
        // 如果所有玩家都没牌了，返回当前玩家（游戏将结束）
        return nextPlayer;
    }

    /** 玩家跳过 */
    pass(playerId: number): { success: boolean, error?: string } {
        const playerIndex = this.getPlayerIndex(playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not in room' };
        }

        if (this.currentPlayerId !== playerIndex) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.status !== 'playing') {
            return { success: false, error: 'Game not in playing state' };
        }

        // 如果是第一手且没有上家出过牌，不能跳过（但 firstMove 模式下可以跳过）
        // 只有在上一手是该玩家自己出的时候才不能跳过
        if (this.lastMove && this.lastMove.playerId === playerIndex) {
            return { success: false, error: 'Cannot pass on first move' };
        }

        // 记录跳过
        this.passedPlayers.add(playerIndex);

        console.log(`[PASS] Player${playerIndex} passed`);

        this.emit('player_passed', playerIndex);

        // 检查一轮结束（所有非起始玩家都跳过）
        if (this.checkRoundClear()) {
            // 更新下一轮的起始玩家为最后出牌者
            this.roundStartPlayerId = this.lastMove ? this.lastMove.playerId : this.roundStartPlayerId;
            // 如果起始玩家没牌了，找下一个有牌的玩家
            if (this.hands[this.roundStartPlayerId].isEmpty) {
                this.roundStartPlayerId = this.getNextPlayerWithCards(this.roundStartPlayerId);
            }
            this.currentPlayerId = this.roundStartPlayerId;
            this.lastMove = null;
            this.passedPlayers.clear(); // 重置跳过记录
            this.emit('round_cleared');
            // 一轮结束后，由最后出牌者继续出牌
            this.turnNotified = false; // 重置通知标志
            console.log(`[TURN] Player${this.roundStartPlayerId}'s turn (pass last played)`);
            this.emit('turn_changed', this.roundStartPlayerId);
        } else {
            // 下一回合，跳过没有手牌的玩家
            this.currentPlayerId = this.getNextPlayerWithCards(this.currentPlayerId);
            this.turnNotified = false; // 重置通知标志
            console.log(`[TURN] Player${this.currentPlayerId}'s turn (pass next)`);
            this.emit('turn_changed', this.currentPlayerId);
        }

        // 如果是 AI，自动出牌
        this.scheduleAIMove();

        return { success: true };
    }

    /** 检查一轮是否结束 */
    private checkRoundClear(): boolean {
        // 只有出过牌之后才能判定一轮结束
        if (!this.lastMove) return false;

        // 王炸（火箭）不再直接结束这一轮，在6人场新规则中王炸只是炸弹牌型的一种
        // 只有当所有其他玩家都跳过时才结束

        // 计算还有手牌的玩家数量
        const playersWithCards = this.players.filter((_, i) => !this.hands[i].isEmpty).length;
        // 至少 passedPlayers.size >= 还有手牌的玩家数量 - 1 时，一轮结束
        // 或者如果最后出牌者已经没牌了，也结束一轮
        const result = this.passedPlayers.size >= playersWithCards - 1;
        return result;
    }

    /** 获取胜利和失败玩家名单 */
    private getWinnerAndLoserNames(isLandlordWin: boolean): { winnerNames: string[], loserNames: string[] } {
        const winnerNames: string[] = [];
        const loserNames: string[] = [];

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            if (!player) continue;

            const isLandlordTeam = i === this.landlordId || this.hiddenLandlordIds.includes(i);
            const name = player.nickname || `玩家${i}`;

            if (isLandlordTeam === isLandlordWin) {
                winnerNames.push(name);
            } else {
                loserNames.push(name);
            }
        }

        return { winnerNames, loserNames };
    }

    /** 获取下一个有玩家的位置 */
    private getNextNonEmptyPlayer(from: number): number {
        let idx = (from + 1) % this.players.length;
        let attempts = 0;
        while (!this.players[idx] && attempts < this.players.length) {
            idx = (idx + 1) % this.players.length;
            attempts++;
        }
        return idx;
    }

    /** 调度 AI 出牌 */
    private scheduleAIMove(): void {
        // 清除之前的定时器
        this.clearAITimers();

        // 如果是选择地主牌阶段（6人场明地主AI）
        if (this.status === 'selecting_landlord_cards' && this.currentPlayerId === this.landlordId) {
            if (this.players[this.landlordId]?.isAI) {
                const delay = 5000 + Math.random() * 1000; // 5-6秒延迟
                this.scheduledPlayerId = this.currentPlayerId;
                const timer = setTimeout(() => {
                    this.executeAIMove();
                }, delay);
                this.aiTimers.push(timer);
                console.log(`[AI调度] 明地主AI选择地主牌，延迟${delay}ms`);
            }
            return;
        }

        // 计算延迟：如果AI是地主且是首轮出牌，使用更长延迟（给客户端播放发牌动画的时间）
        // 后续回合无论是否地主都用 1.5-2 秒
        let delay = 500;
        if (this.players[this.currentPlayerId]?.isAI) {
            const isLandlord = this.currentPlayerId === this.landlordId;
            if (isLandlord && !this.firstMoveDone) {
                delay = 5000 + Math.random() * 1000; // 首轮地主：5-6秒
            } else {
                delay = 1500 + Math.random() * 500; // 后续：1.5-2秒
            }
        }

        // 如果是 AI，延迟后自动出牌
        if (this.players[this.currentPlayerId]?.isAI) {
            this.scheduledPlayerId = this.currentPlayerId;
            const timer = setTimeout(() => {
                this.executeAIMove();
            }, delay);
            this.aiTimers.push(timer);
            console.log(`[AI调度] 延迟${delay}ms后出牌, landlordId=${this.landlordId}, currentPlayerId=${this.currentPlayerId}, firstMoveDone=${this.firstMoveDone}`);
        } else {
            this.scheduledPlayerId = -1;
        }
    }

    /** AI 自动出牌 */
    private executeAIMove(): void {
        // 检查是否轮到被调度的AI玩家出牌（防止过期的setTimeout回调执行）
        const scheduledIdx = this.scheduledPlayerId;
        if (scheduledIdx !== this.currentPlayerId) {
            return;
        }

        // 如果是选择地主牌阶段（AI明地主）
        if (this.status === 'selecting_landlord_cards' && this.currentPlayerId === this.landlordId) {
            const hand = this.hands[this.currentPlayerId];
            if (hand.cards.length > 0) {
                // 随机选择一张牌作为地主牌
                const randomCard = hand.cards[Math.floor(Math.random() * hand.cards.length)];
                console.log(`[AI选择地主牌] 明地主AI随机选择: cardId=${randomCard.id}`);
                this.landlordCardsSelected(this.players[this.currentPlayerId]!.id, randomCard.id);
            }
            return;
        }

        if (this.status !== 'playing') {
            return;
        }
        if (!this.players[this.currentPlayerId]?.isAI) {
            return;
        }

        // 首轮出牌后标记
        if (!this.firstMoveDone) {
            this.firstMoveDone = true;
            console.log(`[首轮完成] firstMoveDone设为true`);
        }

        const hand = this.hands[this.currentPlayerId];
        const validMoves = (this.roomType === 4)
            ? GameRules2.generateValidMoves(hand as unknown as Hand2, this.lastMove, this.currentPlayerId)
            : GameRules.generateValidMoves(hand, this.lastMove, this.currentPlayerId);

        if (validMoves.length === 0) {
            // 无法出牌，尝试跳过
            const passResult = this.pass(this.players[this.currentPlayerId]!.id);
            if (!passResult.success) {
                // 跳过失败，强制出一张牌（如果手牌为空则跳过）
                const cards = hand.cards;
                if (cards.length > 0) {
                    // 按rank排序，选最小的牌出
                    const sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
                    this.playCards(this.players[this.currentPlayerId]!.id, [sortedCards[0].id]);
                }
            }
        } else {
            // AI 出牌逻辑：从单张、对子、三带一种随机选一种牌型，然后出最小的
            const singleMoves = validMoves.filter(m => m.pattern.type === CardPatternType.SINGLE);
            const pairMoves = validMoves.filter(m => m.pattern.type === CardPatternType.PAIR);
            const tripleSingleMoves = validMoves.filter(m => m.pattern.type === CardPatternType.TRIPLE_SINGLE);

            // 收集非空的牌型
            const availablePatterns: { type: string, moves: typeof validMoves }[] = [];
            if (singleMoves.length > 0) availablePatterns.push({ type: 'SINGLE', moves: singleMoves });
            if (pairMoves.length > 0) availablePatterns.push({ type: 'PAIR', moves: pairMoves });
            if (tripleSingleMoves.length > 0) availablePatterns.push({ type: 'TRIPLE_SINGLE', moves: tripleSingleMoves });

            if (availablePatterns.length > 0) {
                // 随机选择一种牌型
                const selected = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
                // 按 primaryValue 排序，选最小的
                const sortedMoves = selected.moves.sort((a, b) => a.pattern.primaryValue - b.pattern.primaryValue);
                const move = sortedMoves[0];
                const cardIds = move.cards.map(c => c.id);
                console.log(`[AI出牌] 随机选择${selected.type}，出${cardIds.join(',')}`);
                try {
                    this.playCards(this.players[this.currentPlayerId]!.id, cardIds);
                } catch (e) {
                    // silently ignore play exception
                }
            } else {
                // 没有单张/对子/三带一，回退到原来的逻辑（出最小的合法牌）
                const sortedMoves = [...validMoves].sort((a, b) => {
                    if (a.cards.length !== b.cards.length) {
                        return a.cards.length - b.cards.length;
                    }
                    return a.pattern.primaryValue - b.pattern.primaryValue;
                });
                const move = sortedMoves[0];
                const cardIds = move.cards.map(c => c.id);
                console.log(`[AI出牌] 回退：出${cardIds.join(',')}`);
                try {
                    this.playCards(this.players[this.currentPlayerId]!.id, cardIds);
                } catch (e) {
                    // silently ignore play exception
                }
            }
        }
    }

    /** 清除所有 AI 定时器 */
    clearAITimers(): void {
        for (const timer of this.aiTimers) {
            clearTimeout(timer);
        }
        this.aiTimers = [];
        this.scheduledPlayerId = -1;
    }

    /** 获取当前玩家ID（位置索引） */
    getCurrentPlayerId(): number {
        return this.currentPlayerId;
    }

    /** 获取玩家信息 */
    getPlayers(): (GamePlayer | null)[] {
        return this.players.map(p => p ? { ...p } : null);
    }

    /** 获取状态 */
    getStatus(): GameStatus {
        return this.status;
    }

    /** 获取地主ID */
    getLandlordId(): number {
        return this.landlordId;
    }

    /** 获取地主牌 */
    getLandlordCards(): Card[] {
        return this.landlordCards;
    }

    /** 获取玩家手牌 */
    getPlayerHand(playerIndex: number): Card[] {
        return this.hands[playerIndex]?.cards || [];
    }

    /** 获取上一手出牌 */
    getLastMove(): Move | null {
        return this.lastMove;
    }

    /** 获取所有玩家手牌（用于广播，不包含具体卡牌ID顺序） */
    getAllHandsForBroadcast(): Card[][] {
        // 不广播具体卡牌，只广播数量和是否地主
        return [];
    }

    /** 客户端动画播放完成，等待开始出牌 */
    clientReady(): void {
        console.log(`[clientReady] called, waitingForClientReady=${this.waitingForClientReady}, currentPlayerId=${this.currentPlayerId}, landlordId=${this.landlordId}, status=${this.status}, quickMatchMode=${this.quickMatchMode}, turnNotified=${this.turnNotified}, isSixPlayer=${isSixPlayerMode(this.roomType)}`);
        if (!this.waitingForClientReady) {
            console.log(`[clientReady] early return: waitingForClientReady is false`);
            return;
        }
        if (this.turnNotified) {
            console.log(`[clientReady] early return: turnNotified is true, skipping`);
            return;
        }
        this.waitingForClientReady = false;
        this.turnNotified = true;

        // 6人场：发牌动画完成后进入选择地主牌阶段
        if (isSixPlayerMode(this.roomType)) {
            this.status = 'selecting_landlord_cards';
            this.currentPlayerId = this.landlordId;
            this.roundStartPlayerId = this.landlordId;
            console.log(`[clientReady] 6人场: 明地主正在选择地主牌, landlordId=${this.currentPlayerId}`);
            this.emit('turn_changed', this.currentPlayerId);

            // 如果明地主是AI，服务器自动选择
            if (this.players[this.landlordId]?.isAI) {
                this.scheduleAIMove();
            }
            return;
        }

        this.status = 'playing';
        console.log(`[clientReady] 3人场: Player${this.currentPlayerId}'s turn`);
        this.emit('turn_changed', this.currentPlayerId);
        this.scheduleAIMove();
    }

    /** 销毁房间 */
    destroy(): void {
        this.clearAITimers();
        this.removeAllListeners();
    }
}
