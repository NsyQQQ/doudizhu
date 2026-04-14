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
    BOMB_four = 20,
    ROCKET_two_SMALL = 21,
    ROCKET_two_MEDIUM = 22,
    ROCKET_two_LARGE = 23,
    BOMB_five = 30,
    BOMB_six = 31,
    ROCKET_three_SMALL = 32,
    ROCKET_three_MEDIUM1 = 33,
    ROCKET_three_MEDIUM2 = 34,
    ROCKET_three_LARGE = 35,
    BOMB_seven = 40,
    BOMB_eight = 41,
    ROCKET_four = 42,
    BOMB_nine = 50,
    BOMB_ten = 51,
    ROCKET_five = 52,
    BOMB_eleven = 60,
    BOMB_twelve = 61,
    ROCKET_six = 62
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
    /** 添加所有王炸 */
    private static addRocketMoves;
    /** 辅助方法：添加王炸到moves */
    private static pushRocketMove;
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