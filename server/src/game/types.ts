/**
 * 斗地主游戏类型定义 - 服务端版本
 */

/** 花色 */
export enum CardSuit {
    SPADE = 0,
    HEART = 1,
    CLUB = 2,
    DIAMOND = 3,
    JOKER = 4,
}

/** 点数 */
export enum CardRank {
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    JACK = 11,
    QUEEN = 12,
    KING = 13,
    ACE = 14,
    TWO = 15,
    SMALL_JOKER = 16,
    BIG_JOKER = 17,
}

/** 牌型 */
export enum CardPatternType {
    PASS = -1,
    INVALID = 0,
    SINGLE = 1,
    PAIR = 2,
    TRIPLE = 3,
    TRIPLE_SINGLE = 4,
    TRIPLE_PAIR = 5,
    STRAIGHT = 6,
    STRAIGHT_PAIRS = 7,
    STRAIGHT_TRIPLES = 8,
    STRAIGHT_TRIPLES_WITH_WINGS_SINGLE = 9,
    STRAIGHT_TRIPLES_WITH_WINGS_PAIR = 10,
    BOMB = 11,
    ROCKET = 12,
    QUADRUPLE_SINGLE = 13,
    QUADRUPLE_PAIR = 14,
}

/** 单张牌 */
export interface Card {
    id: number;
    suit: CardSuit;
    rank: CardRank;
}

/** 牌型识别结果 */
export interface PatternResult {
    type: number;  // 使用 number 支持 CardPatternType 和 CardPatternType2
    primaryValue: number;
    secondaryValue?: number;
}

/** 出牌动作 */
export interface Move {
    cards: Card[];
    pattern: PatternResult;
    playerId: number;
}

/** 玩家信息 */
export interface GamePlayer {
    id: number;
    openid: string;
    nickname: string;
    avatar: string;
    isReady: boolean;
    isHost: boolean;
    isAI: boolean;
    hand: Card[];
    isLandlord: boolean;
    isHiddenLandlord: boolean; // 暗地主（6人场）
    wsId?: string; // WebSocket client ID
}

/** 游戏状态 */
export type GameStatus = 'waiting' | 'dealing' | 'selecting_landlord_cards' | 'playing' | 'ended';

/** 游戏结果 */
export interface GameOverResult {
    winnerId: number;
    isLandlordWin: boolean;
    winnerNames: string[];   // 胜利方玩家名字
    loserNames: string[];   // 失败方玩家名字
}
