/**
 * 游戏规则 - 服务端版本
 */
import { Card, CardRank, PatternResult, Move } from './types';
/** 服务端手牌管理 */
export declare class Hand {
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
/** 游戏规则 */
export declare class GameRules {
    /** 识别牌型 */
    static recognizePattern(cards: Card[]): PatternResult;
    /** 判断 moveA 能否压过 moveB */
    static canBeat(moveA: Move, moveB: Move | null): boolean;
    /** 从手牌生成所有能压过 lastMove 的合法出牌 */
    static generateValidMoves(hand: Hand, lastMove: Move | null, playerId: number): Move[];
    /** 生成所有合法出牌（开局时使用） */
    static generateAllValidMoves(hand: Hand, playerId: number): Move[];
    /** 生成顺子类出牌 */
    private static generateStraightMoves;
}
//# sourceMappingURL=GameRules.d.ts.map