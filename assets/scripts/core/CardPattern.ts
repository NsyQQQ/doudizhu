/**
 * 牌型识别 - 斗地主最核心的算法
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardRank, CardPatternType, PatternResult } from './Card';
import { Hand } from './Hand';

/** 牌型识别器 */
export class CardPatternRecognizer {
    /**
     * 识别一组牌的类型和牌力
     * @param cards 1-8张牌
     * @returns PatternResult 或 null（无效牌型）
     */
    static recognize(cards: Card[]): PatternResult | null {
        if (!cards || cards.length === 0) {
            return { type: CardPatternType.INVALID, primaryValue: 0 };
        }

        // 特殊：2张牌的大小王 = 火箭
        if (cards.length === 2 && this.isRocket(cards)) {
            return { type: CardPatternType.ROCKET, primaryValue: CardRank.BIG_JOKER };
        }

        // 获取点数统计
        const rankCounts = this.getRankCounts(cards);

        // 按数量和点数排序
        const sortedInfo = this.getSortedRankInfo(rankCounts);

        const count = cards.length;

        // ---- 按数量分组分析 ----

        // 1. 单张（1张）
        if (count === 1) {
            return {
                type: CardPatternType.SINGLE,
                primaryValue: cards[0].rank,
            };
        }

        // 2. 一对（2张，同点数）
        if (count === 2 && sortedInfo[0].count === 2) {
            return {
                type: CardPatternType.PAIR,
                primaryValue: sortedInfo[0].rank,
            };
        }

        // 3. 三张（3张，同点数）
        if (count === 3 && sortedInfo[0].count === 3) {
            return {
                type: CardPatternType.TRIPLE,
                primaryValue: sortedInfo[0].rank,
            };
        }

        // 4. 炸弹（4张，同点数）
        if (count === 4 && sortedInfo[0].count === 4) {
            return {
                type: CardPatternType.BOMB,
                primaryValue: sortedInfo[0].rank,
            };
        }

        // ---- 四带类 ----
        if (sortedInfo[0].count === 4) {
            // 四带两对：4+2+2=8张，sortedInfo长度应该为3
            if (count === 8 && sortedInfo.length === 3 && sortedInfo[1].count === 2 && sortedInfo[2].count === 2) {
                return {
                    type: CardPatternType.QUADRUPLE_PAIR,
                    primaryValue: sortedInfo[0].rank,
                };
            }
            // 四带两单：4+1+1=6张
            if (count === 6 && sortedInfo.length === 3 && sortedInfo[1].count === 1 && sortedInfo[2].count === 1) {
                return {
                    type: CardPatternType.QUADRUPLE_SINGLE,
                    primaryValue: sortedInfo[0].rank,
                };
            }
        }

        // ---- 三带类 ----
        if (sortedInfo[0].count === 3) {
            // 三带一
            if (count === 4 && sortedInfo.length === 2 && sortedInfo[1].count === 1) {
                return {
                    type: CardPatternType.TRIPLE_SINGLE,
                    primaryValue: sortedInfo[0].rank,
                };
            }
            // 三带二
            if (count === 5 && sortedInfo.length === 2 && sortedInfo[1].count === 2) {
                return {
                    type: CardPatternType.TRIPLE_PAIR,
                    primaryValue: sortedInfo[0].rank,
                };
            }
        }

        // ---- 顺子 ----
        if (this.isStraight(sortedInfo, 1, 5)) {
            return {
                type: CardPatternType.STRAIGHT,
                primaryValue: sortedInfo[0].rank,
                secondaryValue: sortedInfo.length,
            };
        }

        // ---- 连对 ----
        if (this.isStraight(sortedInfo, 2, 3)) {
            return {
                type: CardPatternType.STRAIGHT_PAIRS,
                primaryValue: sortedInfo[0].rank,
                secondaryValue: sortedInfo.length,
            };
        }

        // ---- 飞机 ----
        if (this.isStraight(sortedInfo, 3, 2)) {
            return {
                type: CardPatternType.STRAIGHT_TRIPLES,
                primaryValue: sortedInfo[0].rank,
                secondaryValue: sortedInfo.length,
            };
        }

        // ---- 飞机带翅膀 ----
        // 找出三张的部分和带牌的部分
        const tripleGroups = sortedInfo.filter(info => info.count === 3);
        const otherGroups = sortedInfo.filter(info => info.count !== 3);

        if (tripleGroups.length >= 2) {
            const isConsecutiveTriples = this.isStraight(tripleGroups, 3, 2);

            if (isConsecutiveTriples) {
                // 检查带的单牌（翅膀）
                if (otherGroups.length === tripleGroups.length &&
                    otherGroups.every(info => info.count === 1)) {
                    return {
                        type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE,
                        primaryValue: tripleGroups[tripleGroups.length - 1].rank,
                        secondaryValue: tripleGroups.length,
                    };
                }

                // 检查带的对牌（翅膀）
                if (otherGroups.length === tripleGroups.length &&
                    otherGroups.every(info => info.count === 2)) {
                    return {
                        type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR,
                        primaryValue: tripleGroups[tripleGroups.length - 1].rank,
                        secondaryValue: tripleGroups.length,
                    };
                }
            }
        }

        return null; // 无效牌型
    }

    /**
     * 检查是否是火箭（大小王）
     */
    private static isRocket(cards: Card[]): boolean {
        const ranks = cards.map(c => c.rank);
        return ranks.some(r => r === CardRank.SMALL_JOKER) && ranks.some(r => r === CardRank.BIG_JOKER);
    }

    /**
     * 获取点数统计
     */
    private static getRankCounts(cards: Card[]): Map<CardRank, number> {
        const counts = new Map<CardRank, number>();
        for (const card of cards) {
            counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
        }
        return counts;
    }

    /**
     * 获取排序后的点数信息
     */
    private static getSortedRankInfo(rankCounts: Map<CardRank, number>): { rank: CardRank; count: number }[] {
        return Array.from(rankCounts.entries())
            .map(([rank, count]) => ({ rank, count }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count; // 数量多的在前
                return b.rank - a.rank; // 数量相同则点数大的在前
            });
    }

    /**
     * 检查是否是顺子/连对/飞机
     * @param sortedInfo 排序后的点数信息
     * @param expectedCount 每组期望的数量（1=单张,2=对子,3=三张）
     * @param minLength 最小长度
     */
    private static isStraight(sortedInfo: { rank: CardRank; count: number }[], expectedCount: number, minLength: number): boolean {
        // 所有组的数量必须相同
        if (!sortedInfo.every(info => info.count === expectedCount)) {
            return false;
        }

        // 长度不够
        if (sortedInfo.length < minLength) {
            return false;
        }

        // 不能有2和小王大王
        for (const info of sortedInfo) {
            if (info.rank >= CardRank.TWO) {
                return false;
            }
        }

        // 点数必须连续
        const sortedByRank = [...sortedInfo].sort((a, b) => a.rank - b.rank);
        for (let i = 1; i < sortedByRank.length; i++) {
            if (sortedByRank[i].rank !== sortedByRank[i - 1].rank + 1) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查一组牌是否是有效的出牌（用于测试）
     */
    static isValidPlay(cards: Card[]): boolean {
        return this.recognize(cards) !== null;
    }
}
