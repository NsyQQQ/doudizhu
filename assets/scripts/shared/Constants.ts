/**
 * 游戏常量
 */

// ==================== 环境配置 ====================
// true = 云服务器环境, false = 本地开发环境
const IS_PRODUCTION = true;

// ==================== 服务器配置 ====================
export const SERVER_CONFIG = IS_PRODUCTION ? {
    HTTP_URL: 'https://duolaf.xyz',
    WS_URL: 'wss://duolaf.xyz',
} : {
    HTTP_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3000',
};

// ==================== 游戏配置 ====================

/** 玩家ID */
export const PLAYER_ID = {
    HUMAN: 0,
    LEFT_AI: 1,
    RIGHT_AI: 2,
} as const;

/** 玩家位置 */
export const PLAYER_SEAT = {
    0: 'bottom',
    1: 'left',
    2: 'right',
} as const;

/** 游戏状态 */
export const GameState = {
    READY: 'ready',
    DEALING: 'dealing',
    LANDLORD_REVEAL: 'landlord_reveal',
    PLAYING: 'playing',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
} as const;

/** AI 出牌思考时间 */
export const AI_THINK_DELAY = 800; // ms

/** 当前房间类型（1-6，用于大厅创建房间） */
export let CURRENT_ROOM_TYPE = 0;

/** 设置当前房间类型 */
export function setCurrentRoomType(type: number): void {
    CURRENT_ROOM_TYPE = type;
}

/** 当前房间ID（4位数，用于进入房间后显示） */
export let CURRENT_ROOM_ID = 0;

/** 设置当前房间ID */
export function setCurrentRoomId(id: number): void {
    CURRENT_ROOM_ID = id;
}

/** 当前房间码（6位数，用于加入房间） */
export let CURRENT_ROOM_CODE = '';

/** 设置当前房间码 */
export function setCurrentRoomCode(code: string): void {
    CURRENT_ROOM_CODE = code;
}

/** 当前玩家在房间中的位置（0=房主/自己, 1, 2） */
export let CURRENT_PLAYER_INDEX = 0;

/** 设置当前玩家位置 */
export function setCurrentPlayerIndex(index: number): void {
    CURRENT_PLAYER_INDEX = index;
}

/** 当前用户ID */
export let CURRENT_USER_ID = 0;

/** 设置当前用户ID */
export function setCurrentUserId(id: number): void {
    CURRENT_USER_ID = id;
}

/** 当前用户名称 */
export let CURRENT_USER_NAME = '';

/** 设置当前用户名称 */
export function setCurrentUserName(name: string): void {
    CURRENT_USER_NAME = name;
}

/** 当前用户头像 */
export let CURRENT_USER_AVATAR = '';

/** 设置当前用户头像 */
export function setCurrentUserAvatar(avatar: string): void {
    CURRENT_USER_AVATAR = avatar;
}

/** 当前玩法类型 */
export let CURRENT_GAME_TYPE = 1;

/** 设置当前玩法类型 */
export function setCurrentGameType(type: number): void {
    CURRENT_GAME_TYPE = type;
}

/** 从GAME_MODE_CONFIG中获取玩家数量（使用当前玩法类型） */
export function getPlayerCountByRoomType(roomType: number): number {
    return GAME_MODE_CONFIG[CURRENT_GAME_TYPE]?.roomTypes[roomType]?.playerCount || 3;
}

/** 从GAME_MODE_CONFIG中获取每人手牌数量（使用当前玩法类型） */
export function getCardsPerPlayerByRoomType(roomType: number): number {
    return GAME_MODE_CONFIG[CURRENT_GAME_TYPE]?.roomTypes[roomType]?.cardsPerPlayer || 17;
}

/** 从GAME_MODE_CONFIG中获取地主牌数量（使用当前玩法类型） */
export function getLandlordCardsByRoomType(roomType: number): number {
    return GAME_MODE_CONFIG[CURRENT_GAME_TYPE]?.roomTypes[roomType]?.landlordCards || 0;
}

/** 玩法配置（玩法类型 -> 房间类型 -> 房间配置） */
export const GAME_MODE_CONFIG: Record<number, {
    roomTypes: Record<number, {
        isOpen: boolean;        // 是否开启
        playerCount: number;     // 玩家数量
        cardsPerPlayer: number;  // 每人手牌数量
        deckCount: number;      // 扑克牌数量
        landlordCards: number;  // 地主牌数量（斗地主玩法独有）
        name: string;           // 房间名称
    }>
}> = {
    1: { // 斗地主
        roomTypes: {
            1: { isOpen: true, playerCount: 3, cardsPerPlayer: 17, deckCount: 54, landlordCards: 3, name: '三人场' },
            2: { isOpen: false, playerCount: 4, cardsPerPlayer: 27, deckCount: 108, landlordCards: 0, name: '四人场' },
            3: { isOpen: false, playerCount: 5, cardsPerPlayer: 21, deckCount: 108, landlordCards: 3, name: '五人场' },
            4: { isOpen: true, playerCount: 6, cardsPerPlayer: 27, deckCount: 162, landlordCards: 0, name: '六人场' },
            5: { isOpen: false, playerCount: 7, cardsPerPlayer: 23, deckCount: 162, landlordCards: 1, name: '七人场' },
        }
    },
    2: { // 扔炸弹
        roomTypes: {
            1: { isOpen: false, playerCount: 4, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '四人场' },
            2: { isOpen: false, playerCount: 6, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '六人场' },
            3: { isOpen: false, playerCount: 8, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '八人场' },
        }
    },
    3: { // 跑得快
        roomTypes: {
            1: { isOpen: false, playerCount: 3, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '三人场' },
            2: { isOpen: false, playerCount: 4, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '四人场' },
            3: { isOpen: false, playerCount: 5, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '五人场' },
        }
    },
    4: { // 斗牛
        roomTypes: {
            1: { isOpen: false, playerCount: 3, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '三人场' },
            2: { isOpen: false, playerCount: 4, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '四人场' },
            3: { isOpen: false, playerCount: 5, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '五人场' },
            4: { isOpen: false, playerCount: 6, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '六人场' },
            5: { isOpen: false, playerCount: 7, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '七人场' },
        }
    },
    5: { // 510K
        roomTypes: {
            1: { isOpen: false, playerCount: 3, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '三人场' },
            2: { isOpen: false, playerCount: 4, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '四人场' },
            3: { isOpen: false, playerCount: 5, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '五人场' },
        }
    },
    6: { // 二百四
        roomTypes: {
            2: { isOpen: false, playerCount: 4, cardsPerPlayer: 0, deckCount: 0, landlordCards: 0, name: '四人场' },
        }
    },
};

/** 当前房间玩家列表 */
export let CURRENT_ROOM_PLAYERS: any[] = [];

/** 设置当前房间玩家列表 */
export function setCurrentRoomPlayers(players: any[]): void {
    CURRENT_ROOM_PLAYERS = players;
}

/** 快速匹配发牌数据 */
export interface QuickMatchDealtData {
    hand: any[];
    landlordCards: any[];
    landlordId: number;
}
export let QUICK_MATCH_DEALT: QuickMatchDealtData | null = null;

/** 设置快速匹配发牌数据 */
export function setQuickMatchDealt(data: QuickMatchDealtData): void {
    QUICK_MATCH_DEALT = data;
}

/** 清除快速匹配发牌数据 */
export function clearQuickMatchDealt(): void {
    QUICK_MATCH_DEALT = null;
}

