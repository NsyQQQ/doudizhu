/**
 * 六人斗地主牌型识别
 * 新增多种炸弹牌型，去除四带二
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardRank, CardPatternType, PatternResult } from './Card';

/** 六人场专用牌型 */
export enum CardPatternType2 {
    PASS = -1,                    // 不出
    INVALID = 0,                  // 无效牌型
    SINGLE = 1,                   // 单张
    PAIR = 2,                     // 对子
    TRIPLE = 3,                   // 三张
    TRIPLE_SINGLE = 4,            // 三带单
    TRIPLE_PAIR = 5,              // 三带对
    STRAIGHT = 6,                 // 顺子（5+张）
    STRAIGHT_PAIRS = 7,           // 连对（3+对）
    STRAIGHT_TRIPLES = 8,         // 飞机（2+三张）
    STRAIGHT_TRIPLES_WITH_WINGS_SINGLE = 9,  // 飞机带单翅膀
    STRAIGHT_TRIPLES_WITH_WINGS_PAIR = 10,   // 飞机带对翅膀

    // ---- 炸弹牌型（同类型按点数比较）----
    // 4炸：4张同点数
    BOMB_four = 20,
    // 小王炸: 2个小王
    ROCKET_two_SMALL = 21,
    // 大小王炸: 1个大王+1个小王
    ROCKET_two_MEDIUM = 22,
    // 大大王炸: 2个大王
    ROCKET_two_LARGE = 23,

    // 5炸: 5张同点数
    BOMB_five = 30,
    // 6炸: 6张同点数
    BOMB_six = 31,
    // 大大大王炸: 3个小王
    ROCKET_three_SMALL = 32,
    // 大小小王炸: 1个大王+2个小王
    ROCKET_three_MEDIUM1 = 33,
    // 大大小王炸: 2个大王+1个小王
    ROCKET_three_MEDIUM2 = 34,
    // 大大大王炸: 3个大王
    ROCKET_three_LARGE = 35,

    // 7炸: 7张同点数
    BOMB_seven = 40,
    // 8炸: 8张同点数
    BOMB_eight = 41,
    // 4王炸: 4个王
    ROCKET_four = 42,

    // 9炸弹: 9张同点数
    BOMB_nine = 50,
    // 10炸: 10张同点数
    BOMB_ten = 51,
    // 5王炸: 5个王
    ROCKET_five = 52,

    // 11炸: 11张同点数
    BOMB_eleven = 60,
    // 12炸: 12张同点数
    BOMB_twelve = 61,
    // 6王炸: 6个王
    ROCKET_six = 62,
}

/** 六人场牌型识别结果 */
export interface PatternResult2 {
    type: CardPatternType2;
    primaryValue: number;
    secondaryValue?: number;
}

/** 六人场炸弹牌型大小排序（从大到小） */
const BOMB_PRIORITY: CardPatternType2[] = [
    CardPatternType2.ROCKET_six,
    CardPatternType2.BOMB_twelve,
    CardPatternType2.BOMB_eleven,

    CardPatternType2.ROCKET_five,
    CardPatternType2.BOMB_ten,
    CardPatternType2.BOMB_nine,

    CardPatternType2.ROCKET_four,
    CardPatternType2.BOMB_eight,
    CardPatternType2.BOMB_seven,

    CardPatternType2.ROCKET_three_LARGE,
    CardPatternType2.ROCKET_three_MEDIUM2,
    CardPatternType2.ROCKET_three_MEDIUM1,
    CardPatternType2.ROCKET_three_SMALL,
    CardPatternType2.BOMB_six,
    CardPatternType2.BOMB_five,
    
    CardPatternType2.ROCKET_two_LARGE,
    CardPatternType2.ROCKET_two_MEDIUM,
    CardPatternType2.ROCKET_two_SMALL,
    CardPatternType2.BOMB_four,
];

/** 获取牌型是否为王炸（支持CardPatternType和CardPatternType2） */
export function isRocket(type: CardPatternType2 | CardPatternType): boolean {
    if (type === CardPatternType.ROCKET) return true;
    return type === CardPatternType2.ROCKET_two_SMALL ||
           type === CardPatternType2.ROCKET_two_MEDIUM ||
           type === CardPatternType2.ROCKET_two_LARGE ||
           type === CardPatternType2.ROCKET_three_SMALL ||
           type === CardPatternType2.ROCKET_three_MEDIUM1 ||
           type === CardPatternType2.ROCKET_three_MEDIUM2 ||
           type === CardPatternType2.ROCKET_three_LARGE ||
           type === CardPatternType2.ROCKET_four ||
           type === CardPatternType2.ROCKET_five ||
           type === CardPatternType2.ROCKET_six;
}

/** 获取牌型是否为炸弹（支持CardPatternType和CardPatternType2） */
export function isBomb(type: CardPatternType2 | CardPatternType): boolean {
    if (type === CardPatternType.BOMB) return true;
    return type === CardPatternType2.BOMB_four ||
           type === CardPatternType2.BOMB_five ||
           type === CardPatternType2.BOMB_six ||
           type === CardPatternType2.BOMB_seven ||
           type === CardPatternType2.BOMB_eight ||
           type === CardPatternType2.BOMB_nine ||
           type === CardPatternType2.BOMB_ten ||
           type === CardPatternType2.BOMB_eleven ||
           type === CardPatternType2.BOMB_twelve;
}

/** 获取炸弹优先级等级（用于比较，值越大等级越高） */
function getBombTier(type: CardPatternType2): number {
    switch (type) {
        case CardPatternType2.ROCKET_six: return 60;
        case CardPatternType2.BOMB_twelve: return 59;
        case CardPatternType2.BOMB_eleven: return 58;
        case CardPatternType2.ROCKET_five: return 57;
        case CardPatternType2.BOMB_ten: return 56;
        case CardPatternType2.BOMB_nine: return 55;
        case CardPatternType2.ROCKET_four: return 54;
        case CardPatternType2.BOMB_eight: return 53;
        case CardPatternType2.BOMB_seven: return 52;
        case CardPatternType2.ROCKET_three_LARGE: return 51;
        case CardPatternType2.ROCKET_three_MEDIUM2: return 50;
        case CardPatternType2.ROCKET_three_MEDIUM1: return 49;
        case CardPatternType2.ROCKET_three_SMALL: return 48;
        case CardPatternType2.BOMB_six: return 47;
        case CardPatternType2.BOMB_five: return 46;
        case CardPatternType2.ROCKET_two_LARGE: return 45;
        case CardPatternType2.ROCKET_two_MEDIUM: return 44;
        case CardPatternType2.ROCKET_two_SMALL: return 43;
        case CardPatternType2.BOMB_four: return 42;
        default: return 0;
    }
}

/** 获取王炸的级别（用于比较，大小王不分开比较） */
function getRocketPrimaryValue(type: CardPatternType2): number {
    switch (type) {
        case CardPatternType2.ROCKET_six: return 6;
        case CardPatternType2.ROCKET_five: return 5;
        case CardPatternType2.ROCKET_four: return 4;
        case CardPatternType2.ROCKET_three_LARGE: return 3;
        case CardPatternType2.ROCKET_three_MEDIUM2: return 3;
        case CardPatternType2.ROCKET_three_MEDIUM1: return 3;
        case CardPatternType2.ROCKET_three_SMALL: return 3;
        case CardPatternType2.ROCKET_two_LARGE: return 2;
        case CardPatternType2.ROCKET_two_MEDIUM: return 2;
        case CardPatternType2.ROCKET_two_SMALL: return 2;
        default: return 0;
    }
}

/** 获取炸弹的级别（用于比较） */
function getBombPrimaryValue(type: CardPatternType2): number {
    switch (type) {
        case CardPatternType2.BOMB_twelve: return 12;
        case CardPatternType2.BOMB_eleven: return 11;
        case CardPatternType2.BOMB_ten: return 10;
        case CardPatternType2.BOMB_nine: return 9;
        case CardPatternType2.BOMB_eight: return 8;
        case CardPatternType2.BOMB_seven: return 7;
        case CardPatternType2.BOMB_six: return 6;
        case CardPatternType2.BOMB_five: return 5;
        case CardPatternType2.BOMB_four: return 4;
        default: return 0;
    }
}

/** 六人场牌型识别器 */
export class CardPatternRecognizer2 {
    /**
     * 识别一组牌的类型
     * @param cards 1-20张牌（六人场手牌最多27张）
     * @returns PatternResult2 或 null（无效牌型）
     */
    static recognize(cards: Card[]): PatternResult | null {
        if (!cards || cards.length === 0) {
            return { type: CardPatternType.INVALID, primaryValue: 0 };
        }

        // ---- 先检测王炸（不区分大小王，按数量）----
        const rocketResult = this.recognizeRocket(cards);
        if (rocketResult) {
            return rocketResult;
        }

        // ---- 获取点数统计 ----
        const rankCounts = this.getRankCounts(cards);
        const sortedInfo = this.getSortedRankInfo(rankCounts);
        const count = cards.length;

        // ---- 单张 ----
        if (count === 1) {
            return {
                type: CardPatternType.SINGLE,
                primaryValue: cards[0].rank,
            };
        }

        // ---- 对子 ----
        if (count === 2 && sortedInfo[0].count === 2) {
            return {
                type: CardPatternType.PAIR,
                primaryValue: sortedInfo[0].rank,
            };
        }

        // ---- 三张 ----
        if (count === 3 && sortedInfo[0].count === 3) {
            return {
                type: CardPatternType.TRIPLE,
                primaryValue: sortedInfo[0].rank,
            };
        }

        // ---- 检测炸弹（按同点数张数分类）----
        const bombResult = this.recognizeBomb(sortedInfo, count);
        if (bombResult) {
            return bombResult;
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
        const tripleGroups = sortedInfo.filter(info => info.count === 3);
        const otherGroups = sortedInfo.filter(info => info.count !== 3);

        if (tripleGroups.length >= 2) {
            const isConsecutiveTriples = this.isStraight(tripleGroups, 3, 2);

            if (isConsecutiveTriples) {
                // 带单牌翅膀
                if (otherGroups.length === tripleGroups.length &&
                    otherGroups.every(info => info.count === 1)) {
                    return {
                        type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE,
                        primaryValue: tripleGroups[tripleGroups.length - 1].rank,
                        secondaryValue: tripleGroups.length,
                    };
                }

                // 带对牌翅膀
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
     * 识别王炸牌型（区分大小王组成）
     */
    private static recognizeRocket(cards: Card[]): PatternResult | null {
        // 统计大小王的数量
        let smallCount = 0;
        let bigCount = 0;
        for (const card of cards) {
            if (card.rank === CardRank.SMALL_JOKER) {
                smallCount++;
            } else if (card.rank === CardRank.BIG_JOKER) {
                bigCount++;
            }
        }

        const jokerCount = smallCount + bigCount;

        // 所有牌都是王
        if (jokerCount !== cards.length) {
            return null;
        }

        // 王炸：张数2-6
        if (jokerCount < 2 || jokerCount > 6) {
            return null;
        }

        // 根据王的大小和数量确定类型
        const rocketType: CardPatternType2 = (() => {
            switch (jokerCount) {
                case 2:
                    if (smallCount >= 2) return CardPatternType2.ROCKET_two_SMALL;
                    if (smallCount >= 1 && bigCount >= 1) return CardPatternType2.ROCKET_two_MEDIUM;
                    return CardPatternType2.ROCKET_two_LARGE;
                case 3:
                    if (smallCount >= 3) return CardPatternType2.ROCKET_three_SMALL;
                    if (smallCount >= 2 && bigCount >= 1) return CardPatternType2.ROCKET_three_MEDIUM1;
                    if (smallCount >= 1 && bigCount >= 2) return CardPatternType2.ROCKET_three_MEDIUM2;
                    return CardPatternType2.ROCKET_three_LARGE;
                case 4: return CardPatternType2.ROCKET_four;
                case 5: return CardPatternType2.ROCKET_five;
                case 6: return CardPatternType2.ROCKET_six;
                default: return CardPatternType2.INVALID;
            }
        })();

        return {
            type: rocketType as unknown as CardPatternType,
            primaryValue: getRocketPrimaryValue(rocketType) * 10000, // 王炸级别*10000，确保比炸弹大
            secondaryValue: jokerCount,
        };
    }

    /**
     * 识别炸弹牌型（按同点数张数分类）
     * 4炸 → 5炸 → 6炸 → 7炸 → 8炸 → 9炸 → 10炸 → 11炸 → 12炸
     */
    private static recognizeBomb(sortedInfo: { rank: CardRank; count: number }[], count: number): PatternResult | null {
        // 需要所有牌同点数
        if (sortedInfo.length !== 1) {
            return null;
        }

        const cardCount = sortedInfo[0].count;
        const rank = sortedInfo[0].rank;

        // 炸弹需要4+张
        if (cardCount < 4) {
            return null;
        }

        // 不能是王（王炸单独处理）
        if (rank === CardRank.SMALL_JOKER || rank === CardRank.BIG_JOKER) {
            return null;
        }

        const bombType: CardPatternType2 = (() => {
            if (cardCount >= 12) return CardPatternType2.BOMB_twelve;
            if (cardCount >= 11) return CardPatternType2.BOMB_eleven;
            if (cardCount >= 10) return CardPatternType2.BOMB_ten;
            if (cardCount >= 9) return CardPatternType2.BOMB_nine;
            if (cardCount >= 8) return CardPatternType2.BOMB_eight;
            if (cardCount >= 7) return CardPatternType2.BOMB_seven;
            if (cardCount >= 6) return CardPatternType2.BOMB_six;
            if (cardCount >= 5) return CardPatternType2.BOMB_five;
            return CardPatternType2.BOMB_four;
        })();

        return {
            type: bombType as unknown as CardPatternType,
            primaryValue: getBombPrimaryValue(bombType) * 100 + rank, // 炸弹级别*100 + 点数
            secondaryValue: cardCount,
        };
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
     */
    private static isStraight(sortedInfo: { rank: CardRank; count: number }[], expectedCount: number, minLength: number): boolean {
        // 所有组的数量必须相同
        if (!sortedInfo.every(info => info.count === expectedCount)) {
            return false;
        }

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
     * 比较两个牌型的大小
     * @returns 1: a > b, -1: a < b, 0: 相等
     */
    static compare(a: PatternResult, b: PatternResult): number {
        const typeA = a.type as unknown as CardPatternType2;
        const typeB = b.type as unknown as CardPatternType2;

        // 都是一般牌型
        if (!isBomb(typeA) && !isRocket(typeA) && !isBomb(typeB) && !isRocket(typeB)) {
            // 类型不同不能比较
            if (typeA !== typeB) return 0;

            // 同类型按主值比较
            if (a.primaryValue > b.primaryValue) return 1;
            if (a.primaryValue < b.primaryValue) return -1;
            return 0;
        }

        // 都是炸弹/王炸类
        if ((isBomb(typeA) || isRocket(typeA)) && (isBomb(typeB) || isRocket(typeB))) {
            if (typeA !== typeB) {
                const tierA = getBombTier(typeA);
                const tierB = getBombTier(typeB);

                // 不同等级：等级高的赢（index 小的优先级高）
                if (tierA !== tierB) {
                    const priorityA = BOMB_PRIORITY.indexOf(typeA);
                    const priorityB = BOMB_PRIORITY.indexOf(typeB);
                    return priorityA < priorityB ? 1 : priorityA > priorityB ? -1 : 0;
                }

                // 同等级：比较主值
                if (a.primaryValue > b.primaryValue) return 1;
                if (a.primaryValue < b.primaryValue) return -1;
                return 0;
            }

            // 同类型按主值（级别*100+点数）
            if (a.primaryValue > b.primaryValue) return 1;
            if (a.primaryValue < b.primaryValue) return -1;
            return 0;
        }

        // 炸弹/王炸 > 一般牌型
        if (isBomb(typeA) || isRocket(typeA)) {
            return 1;
        }
        return -1;
    }

    /**
     * 检查一组牌是否是有效的出牌
     */
    static isValidPlay(cards: Card[]): boolean {
        return this.recognize(cards) !== null;
    }

}
