/**
 * 出牌动作数据结构
 */

import { Card, PatternResult } from './Card';

/** 出牌动作 */
export interface Move {
    cards: Card[];           // 出的牌
    pattern: PatternResult; // 识别的牌型
    playerId: number;        // 出牌者ID (0=玩家, 1=左AI, 2=右AI)
}

/** 创建不出动作 */
export function createPassMove(playerId: number): Move {
    return {
        cards: [],
        pattern: {
            type: -1, // PASS
            primaryValue: 0,
        },
        playerId,
    };
}

/** 判断是否是不出 */
export function isPass(move: Move): boolean {
    return move.cards.length === 0;
}

/** 创建出牌动作 */
export function createPlayMove(cards: Card[], pattern: PatternResult, playerId: number): Move {
    return { cards, pattern, playerId };
}
