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
/** 玩家数量 */
export const PLAYER_COUNT = 3;

/** 每人初始手牌数 */
export const CARDS_PER_PLAYER = 17;

/** 地主底牌数 */
export const LANDLORD_CARDS = 3;

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

/** 发牌动画延迟 */
export const DEAL_CARD_DELAY = 80; // ms

/** AI 出牌思考时间 */
export const AI_THINK_DELAY = 800; // ms

/** 牌型名称（用于调试） */
export const PATTERN_NAMES: Record<number, string> = {
    [-1]: 'PASS',
    0: 'INVALID',
    1: 'SINGLE',
    2: 'PAIR',
    3: 'TRIPLE',
    4: 'TRIPLE_SINGLE',
    5: 'TRIPLE_PAIR',
    6: 'STRAIGHT',
    7: 'STRAIGHT_PAIRS',
    8: 'STRAIGHT_TRIPLES',
    9: 'BOMB',
    10: 'ROCKET',
    11: 'QUADRUPLE_SINGLE',
    12: 'QUADRUPLE_PAIR',
};

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

/** 房间类型对应玩家数量 */
export const ROOM_PLAYER_COUNTS: Record<number, number> = {
    1: 3,
    2: 4,
    3: 6,
    4: 5,
    5: 6,
    6: 7,
};

/** 房间类型对应每人手牌数量 */
export const ROOM_CARDS_PER_PLAYER: Record<number, number> = {
    1: 17,
    2: 13,
    3: 25,
    4: 11,
    5: 27,
    6: 21,
};

/** 房间名称配置 */
export const ROOM_NAMES: Record<number, string> = {
    1: '三人斗地主',
    2: '四人斗地主',
    3: '六人斗地主',
    4: '五人斗地主',
    5: '六人斗地主',
    6: '七人斗地主',
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

