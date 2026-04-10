/**
 * 游戏房间 - 服务端游戏状态管理
 */
import { Card, GamePlayer, GameStatus, GameOverResult, Move, PatternResult } from './types';
import { EventEmitter } from 'events';
/** 获取房间类型对应的玩家数量 */
export declare function getPlayerCountByRoomType(roomType: number): number;
/** 获取房间类型对应的牌组数量 */
export declare function getDeckCountByRoomType(roomType: number): number;
/** 获取房间类型对应的每人手牌数量 */
export declare function getCardsPerPlayerByRoomType(roomType: number): number;
/** 获取房间类型对应的底牌数量 */
export declare function getLandlordCardsByRoomType(roomType: number): number;
export type GameRoomEventType = 'player_ready' | 'player_unready' | 'game_start' | 'game_dealt' | 'landlord_selected' | 'turn_changed' | 'cards_played' | 'player_passed' | 'round_cleared' | 'game_over' | 'player_disconnected';
export interface GameRoomEvents {
    player_ready: (playerId: number) => void;
    player_unready: (playerId: number) => void;
    game_start: () => void;
    game_dealt: (data: {
        hands: Card[][];
        landlordCards: Card[];
        landlordId: number;
    }) => void;
    landlord_selected: (data: {
        landlordId: number;
        hiddenLandlordIds: number[];
        landlordCardId: number;
    }) => void;
    turn_changed: (playerId: number) => void;
    cards_played: (data: {
        playerId: number;
        cards: Card[];
        pattern: PatternResult;
    }) => void;
    player_passed: (playerId: number) => void;
    round_cleared: () => void;
    game_over: (result: GameOverResult) => void;
    player_disconnected: (playerId: number) => void;
}
export declare class GameRoom extends EventEmitter {
    readonly roomCode: string;
    readonly roomId: number;
    readonly roomType: number;
    private players;
    private status;
    private landlordId;
    private hiddenLandlordIds;
    private landlordCards;
    private landlordCardId;
    private hands;
    private currentPlayerId;
    private lastMove;
    private roundStartPlayerId;
    private passedPlayers;
    private aiTimers;
    private quickMatchMode;
    private scheduledPlayerId;
    private waitingForClientReady;
    private turnNotified;
    private firstMoveDone;
    private finishedFarmerCount;
    constructor(roomCode: string, roomId: number, roomType?: number);
    /** 设置快速匹配模式 */
    setQuickMatchMode(enabled: boolean): void;
    /** 添加玩家到房间 */
    addPlayer(player: Omit<GamePlayer, 'hand' | 'isLandlord' | 'isHiddenLandlord'>): number | null;
    /** 移除玩家 */
    removePlayer(playerId: number): void;
    /** 添加AI玩家 */
    addAI(targetPosition?: number, nickname?: string): {
        success: boolean;
        position?: number;
        error?: string;
    };
    /** 移除AI玩家 */
    removeAI(position: number): {
        success: boolean;
        error?: string;
    };
    /** 获取玩家位置索引 */
    getPlayerIndex(playerId: number): number;
    /** 玩家准备 */
    setPlayerReady(playerId: number, ready: boolean): void;
    /** 检查是否所有人都准备好了 */
    allPlayersReady(): boolean;
    /** 检查是否有空位 */
    hasEmptySlot(): boolean;
    /** 获取真实玩家数量 */
    getPlayerCount(): number;
    /** 玩家是否都在场 */
    allPlayersPresent(): boolean;
    /** 开始游戏 */
    startGame(): boolean;
    /** 重开游戏（游戏结束后再来一局） */
    restartGame(): boolean;
    /** 发牌 */
    private dealCards;
    /** 明地主选择地主牌 */
    landlordCardsSelected(playerId: number, cardId: number): {
        success: boolean;
        error?: string;
    };
    /** 玩家出牌 */
    playCards(playerId: number, cardIds: number[]): {
        success: boolean;
        error?: string;
    };
    /** 获取下一个还有手牌的玩家索引 */
    private getNextPlayerWithCards;
    /** 玩家跳过 */
    pass(playerId: number): {
        success: boolean;
        error?: string;
    };
    /** 检查一轮是否结束 */
    private checkRoundClear;
    /** 获取胜利和失败玩家名单 */
    private getWinnerAndLoserNames;
    /** 获取下一个有玩家的位置 */
    private getNextNonEmptyPlayer;
    /** 调度 AI 出牌 */
    private scheduleAIMove;
    /** AI 自动出牌 */
    private executeAIMove;
    /** 清除所有 AI 定时器 */
    clearAITimers(): void;
    /** 获取当前玩家ID（位置索引） */
    getCurrentPlayerId(): number;
    /** 获取玩家信息 */
    getPlayers(): (GamePlayer | null)[];
    /** 获取状态 */
    getStatus(): GameStatus;
    /** 获取地主ID */
    getLandlordId(): number;
    /** 获取地主牌 */
    getLandlordCards(): Card[];
    /** 获取玩家手牌 */
    getPlayerHand(playerIndex: number): Card[];
    /** 获取上一手出牌 */
    getLastMove(): Move | null;
    /** 获取所有玩家手牌（用于广播，不包含具体卡牌ID顺序） */
    getAllHandsForBroadcast(): Card[][];
    /** 客户端动画播放完成，等待开始出牌 */
    clientReady(): void;
    /** 销毁房间 */
    destroy(): void;
}
//# sourceMappingURL=GameRoom.d.ts.map