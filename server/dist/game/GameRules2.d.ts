/**
 * 6人斗地主游戏规则（3副牌）
 * 新牌型：多种炸弹牌型、王炸牌型，去除四带二
 */
import { Card, CardRank, PatternResult, Move } from './types';
/** 六人场专用牌型 */
export declare enum CardPatternType2 {
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
    BOMB_SMALL = 20,
    BOMB_MEDIUM_SMALL = 21,
    BOMB_MEDIUM = 22,
    BOMB_MEDIUM_LARGE = 23,
    BOMB_LARGE = 24,
    ROCKET_SMALL = 30,
    ROCKET_MEDIUM_SMALL = 31,
    ROCKET_MEDIUM = 32,
    ROCKET_MEDIUM_LARGE = 33,
    ROCKET_LARGE = 34
}
/** 服务端手牌管理（6人场） */
export declare class Hand2 {
    private _cards;
    constructor(cards?: Card[]);
    get cards(): Card[];
    get count(): number;
    get isEmpty(): boolean;
    sortByRankDescending(): void;
    addCards(cards: Card[]): void;
    removeCards(cards: Card[]): void;
    getCardsByRank(rank: CardRank): Card[];
    getRankCounts(): Map<CardRank, number>;
    countRank(rank: CardRank): number;
    getDistinctRanks(): CardRank[];
    hasRocket(): boolean;
    hasRank(rank: CardRank): boolean;
    getRankCountList(): {
        rank: CardRank;
        count: number;
    }[];
}
/** 6人斗地主游戏规则（3副牌） */
export declare class GameRules2 {
    /** 识别牌型 */
    static recognizePattern(cards: Card[]): PatternResult;
    /** 识别王炸 */
    private static recognizeRocket;
    /** 识别炸弹 */
    private static recognizeBomb;
    /** 判断 moveA 能否压过 moveB */
    static canBeat(moveA: Move, moveB: Move | null): boolean;
    /** 从手牌生成所有能压过 lastMove 的合法出牌 */
    static generateValidMoves(hand: Hand2, lastMove: Move | null, playerId: number): Move[];
    /** 添加所有王炸（可选：只添加能打过 lastMove 的） */
    private static addRocketMoves;
    /** 添加所有能压过 lastPattern 的炸弹 */
    private static addBombMoves;
    /** 生成所有合法出牌（开局时使用） */
    static generateAllValidMoves(hand: Hand2, playerId: number): Move[];
    /** 添加所有炸弹 */
    private static addAllBombs;
    /** 生成顺子类出牌 */
    private static generateStraightMoves;
}
//# sourceMappingURL=GameRules2.d.ts.map