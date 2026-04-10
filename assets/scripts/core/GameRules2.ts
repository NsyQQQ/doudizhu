/**
 * 六人斗地主游戏规则
 * 基于新牌型：多种炸弹牌型、王炸牌型，去除四带二
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardRank, CardPatternType, PatternResult } from './Card';
import { Hand } from './Hand';
import { Move } from './Move';
import { CardPatternRecognizer2, CardPatternType2 } from './CardPattern2';

/** 六人场炸弹优先级（从大到小） */
const BOMB_PRIORITY: CardPatternType2[] = [
    CardPatternType2.ROCKET_LARGE,        // 大火箭
    CardPatternType2.BOMB_LARGE,           // 大炸弹
    CardPatternType2.ROCKET_MEDIUM_LARGE,  // 中大火箭
    CardPatternType2.BOMB_MEDIUM_LARGE,    // 中大炸弹
    CardPatternType2.ROCKET_MEDIUM,        // 中火箭
    CardPatternType2.BOMB_MEDIUM,          // 中炸弹
    CardPatternType2.BOMB_MEDIUM_SMALL,   // 中小炸弹
    CardPatternType2.ROCKET_MEDIUM_SMALL,  // 中小火箭
    CardPatternType2.ROCKET_SMALL,         // 小火箭
    CardPatternType2.BOMB_SMALL,            // 小炸弹
];

/** 判断是否是炸弹类型（CardPatternType2） */
function isBombType2(type: unknown): boolean {
    const t = type as CardPatternType2;
    return t === CardPatternType2.BOMB_SMALL ||
           t === CardPatternType2.BOMB_MEDIUM_SMALL ||
           t === CardPatternType2.BOMB_MEDIUM ||
           t === CardPatternType2.BOMB_MEDIUM_LARGE ||
           t === CardPatternType2.BOMB_LARGE;
}

/** 判断是否是王炸类型（CardPatternType2） */
function isRocketType2(type: unknown): boolean {
    const t = type as CardPatternType2;
    return t === CardPatternType2.ROCKET_SMALL ||
           t === CardPatternType2.ROCKET_MEDIUM_SMALL ||
           t === CardPatternType2.ROCKET_MEDIUM ||
           t === CardPatternType2.ROCKET_MEDIUM_LARGE ||
           t === CardPatternType2.ROCKET_LARGE;
}

/** 判断是否是炸弹类型（CardPatternType） */
function isBombType(type: unknown): boolean {
    const t = type as CardPatternType;
    return t === CardPatternType.BOMB || isBombType2(type);
}

/** 判断是否是王炸类型（CardPatternType） */
function isRocketType(type: unknown): boolean {
    const t = type as CardPatternType;
    return t === CardPatternType.ROCKET || isRocketType2(type);
}

/** 获取炸弹优先级索引 */
function getBombPriorityIndex(type: unknown): number {
    return BOMB_PRIORITY.indexOf(type as CardPatternType2);
}

/** 获取炸弹/火箭的等级（1-5），用于同级比较 */
function getBombTier(type: unknown): number {
    const t = type as CardPatternType2;
    switch (t) {
        case CardPatternType2.BOMB_SMALL:
        case CardPatternType2.ROCKET_SMALL:
            return 1;  // 小
        case CardPatternType2.BOMB_MEDIUM_SMALL:
        case CardPatternType2.ROCKET_MEDIUM_SMALL:
            return 2;  // 中小
        case CardPatternType2.BOMB_MEDIUM:
        case CardPatternType2.ROCKET_MEDIUM:
            return 3;  // 中
        case CardPatternType2.BOMB_MEDIUM_LARGE:
        case CardPatternType2.ROCKET_MEDIUM_LARGE:
            return 4;  // 中大
        case CardPatternType2.BOMB_LARGE:
        case CardPatternType2.ROCKET_LARGE:
            return 5;  // 大
        default:
            return 0;
    }
}

/** 六人场游戏规则类 */
export class GameRules2 {
    /**
     * 判断 moveA 能否压过 moveB
     */
    static canBeat(moveA: Move, moveB: Move | null): boolean {
        // 空动作（PASS）
        if (moveA.cards.length === 0) return true;

        // 无参考动作，任何合法出牌都可以
        if (!moveB || moveB.cards.length === 0) {
            return moveA.pattern.type !== CardPatternType.INVALID;
        }

        const patternA = moveA.pattern;
        const patternB = moveB.pattern;
        const typeA = patternA.type as unknown as CardPatternType2;
        const typeB = patternB.type as unknown as CardPatternType2;

        // ---- 都是炸弹/王炸 ----
        if ((isBombType(typeA) || isRocketType(typeA)) && (isBombType(typeB) || isRocketType(typeB))) {
            if (typeA !== typeB) {
                // 不同类型：按优先级顺序比较，index 小的赢
                return getBombPriorityIndex(typeA) < getBombPriorityIndex(typeB);
            }
            // 同类型：比较主值（炸弹比点数，火箭比王数量）
            return patternA.primaryValue > patternB.primaryValue;
        }

        // ---- 王炸 vs 一般牌型 ----
        if (isRocketType(typeA)) return true;
        if (isRocketType(typeB)) return false;

        // ---- 炸弹 vs 一般牌型 ----
        if (isBombType(typeA)) return true;
        if (isBombType(typeB)) return false;

        // ---- 飞机带翅膀可以压飞机 ----
        const tA = typeA as unknown as CardPatternType;
        const tB = typeB as unknown as CardPatternType;
        const isPlaneA = tA === CardPatternType.STRAIGHT_TRIPLES ||
            tA === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            tA === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;
        const isPlaneB = tB === CardPatternType.STRAIGHT_TRIPLES ||
            tB === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            tB === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;

        if (isPlaneA && isPlaneB) {
            // 飞机之间比较，只比较主值（三张部分的点数）
            return patternA.primaryValue > patternB.primaryValue;
        }

        // 其他牌型必须类型相同才能压
        if (typeA !== typeB) return false;

        // 必须数量相同
        if (moveA.cards.length !== moveB.cards.length) return false;

        // 比较主值（点数）
        return patternA.primaryValue > patternB.primaryValue;
    }

    /**
     * 从手牌中生成所有能压过 lastMove 的合法出牌
     */
    static generateValidMoves(hand: Hand, lastMove: Move | null, playerId: number): Move[] {
        const moves: Move[] = [];

        // 如果没有参考动作，可以出任意合法牌
        if (!lastMove || lastMove.cards.length === 0) {
            return this.generateAllValidMoves(hand, playerId);
        }

        const lastPattern = lastMove.pattern;
        const lastCardCount = lastMove.cards.length;
        const lastType: CardPatternType = lastPattern.type;

        // 生成所有组合尝试压牌
        const rankCounts = hand.getRankCounts();

        // ---- 根据上一手的牌型尝试 ----
        switch (lastType) {
            case CardPatternType.SINGLE:
                // 找所有单张
                for (const [rank] of rankCounts) {
                    if (rank > lastPattern.primaryValue) {
                        const rankCards = hand.getCardsByRank(rank);
                        moves.push({
                            cards: [rankCards[0]],
                            pattern: { type: CardPatternType.SINGLE, primaryValue: rank },
                            playerId,
                        });
                    }
                }
                // 所有王炸可以打任何单张
                this.addRocketMoves(hand, lastMove, playerId, moves);
                // 炸弹可以打单张
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            case CardPatternType.PAIR:
                // 找所有对比子大的对子
                for (const [rank, count] of rankCounts) {
                    if (count >= 2 && rank > lastPattern.primaryValue) {
                        const rankCards = hand.getCardsByRank(rank);
                        moves.push({
                            cards: [rankCards[0], rankCards[1]],
                            pattern: { type: CardPatternType.PAIR, primaryValue: rank },
                            playerId,
                        });
                    }
                }
                // 王炸、炸弹
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            case CardPatternType.TRIPLE:
                // 找所有大三张
                for (const [rank, count] of rankCounts) {
                    if (count >= 3 && rank > lastPattern.primaryValue) {
                        const rankCards = hand.getCardsByRank(rank);
                        moves.push({
                            cards: [rankCards[0], rankCards[1], rankCards[2]],
                            pattern: { type: CardPatternType.TRIPLE, primaryValue: rank },
                            playerId,
                        });
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            case CardPatternType.TRIPLE_SINGLE:
                // 三带一：核心三张要比上家大
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        const remainingCards = hand.cards.filter(c => c.rank !== tripleRank);
                        for (const singleCard of remainingCards) {
                            moves.push({
                                cards: [tripleCards[0], tripleCards[1], tripleCards[2], singleCard],
                                pattern: { type: CardPatternType.TRIPLE_SINGLE, primaryValue: tripleRank },
                                playerId,
                            });
                        }
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            case CardPatternType.TRIPLE_PAIR:
                // 三带二
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        for (const [pairRank, pairCount] of rankCounts) {
                            if (pairCount >= 2 && pairRank !== tripleRank) {
                                const pairCards = hand.getCardsByRank(pairRank);
                                moves.push({
                                    cards: [tripleCards[0], tripleCards[1], tripleCards[2], pairCards[0], pairCards[1]],
                                    pattern: { type: CardPatternType.TRIPLE_PAIR, primaryValue: tripleRank },
                                    playerId,
                                });
                            }
                        }
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            case CardPatternType.STRAIGHT:
            case CardPatternType.STRAIGHT_PAIRS:
            case CardPatternType.STRAIGHT_TRIPLES:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR:
                this.generateStraightMoves(hand, lastPattern, lastCardCount, playerId, moves);
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;

            // ---- 炸弹类 ----
            case CardPatternType.BOMB:
                // 普通炸弹可以压任意非炸弹/王炸的牌
                // 更大的炸弹或王炸可以压
                this.addBombMoves(hand, lastPattern, playerId, moves);
                this.addRocketMoves(hand, lastMove, playerId, moves);
                break;

            // ---- 王炸类 ----
            case CardPatternType.ROCKET:
                // 王炸最大，只能被更大的王炸压
                this.addRocketMoves(hand, lastMove, playerId, moves);
                break;
        }

        // ---- 处理 CardPatternType2 特有的炸弹/王炸类型 ----
        const lastType2 = lastPattern.type as unknown as CardPatternType2;
        if (isBombType2(lastType2)) {
            // 更大的炸弹或王炸可以压
            this.addBombMoves(hand, lastPattern, playerId, moves);
            this.addRocketMoves(hand, lastMove, playerId, moves);
        } else if (isRocketType2(lastType2)) {
            // 王炸：更大的王炸或炸弹可以压
            this.addRocketMoves(hand, lastMove, playerId, moves);
            this.addBombMoves(hand, lastPattern, playerId, moves);
        }

        return moves;
    }

    /**
     * 添加所有王炸出牌（可选：只添加能打过 lastMove 的）
     */
    private static addRocketMoves(hand: Hand, lastMove: Move | null, playerId: number, moves: Move[]): void {
        // 统计王的数量
        const jokerCards = hand.cards.filter(
            c => c.rank === CardRank.SMALL_JOKER || c.rank === CardRank.BIG_JOKER
        );
        const jokerCount = jokerCards.length;

        // 2-6个王可以组成王炸
        for (let i = 2; i <= Math.min(6, jokerCount); i++) {
            const rocketCards = jokerCards.slice(0, i);
            const rocketType: CardPatternType2 = (() => {
                switch (i) {
                    case 2: return CardPatternType2.ROCKET_SMALL;
                    case 3: return CardPatternType2.ROCKET_MEDIUM_SMALL;
                    case 4: return CardPatternType2.ROCKET_MEDIUM;
                    case 5: return CardPatternType2.ROCKET_MEDIUM_LARGE;
                    case 6: return CardPatternType2.ROCKET_LARGE;
                    default: return CardPatternType2.INVALID;
                }
            })();

            const primaryValue = (() => {
                switch (i) {
                    case 2: return 1 * 10000;
                    case 3: return 2 * 10000;
                    case 4: return 3 * 10000;
                    case 5: return 4 * 10000;
                    case 6: return 5 * 10000;
                    default: return 0;
                }
            })();

            const rocketMove: Move = {
                cards: rocketCards,
                pattern: { type: rocketType as unknown as CardPatternType, primaryValue, secondaryValue: i },
                playerId,
            };

            // 如果有上家，检查是否能打过
            if (lastMove && lastMove.cards.length > 0) {
                if (!this.canBeat(rocketMove, lastMove)) continue;
            }

            moves.push(rocketMove);
        }
    }

    /**
     * 添加所有能压过 lastPattern 的炸弹
     */
    private static addBombMoves(hand: Hand, lastPattern: PatternResult, playerId: number, moves: Move[]): void {
        const lastType = lastPattern.type as unknown as CardPatternType2;
        const lastPriority = getBombPriorityIndex(lastType);
        const lastPrimaryValue = lastPattern.primaryValue;

        const rankCounts = hand.getRankCounts();

        // 遍历所有可能的炸弹
        for (const [rank, count] of rankCounts) {
            // 王不能组成炸弹（王炸单独处理）
            if (rank === CardRank.SMALL_JOKER || rank === CardRank.BIG_JOKER) continue;

            // 炸弹需要4+张
            if (count < 4) continue;

            const rankCards = hand.getCardsByRank(rank);

            // 遍历所有炸弹类型
            for (const bombType of BOMB_PRIORITY) {
                if (isRocketType2(bombType)) continue; // 跳过王炸

                // 需要有足够的牌
                const neededCards = (() => {
                    switch (bombType) {
                        case CardPatternType2.BOMB_SMALL: return 4;
                        case CardPatternType2.BOMB_MEDIUM_SMALL: return 5;
                        case CardPatternType2.BOMB_MEDIUM: return 7;
                        case CardPatternType2.BOMB_MEDIUM_LARGE: return 9;
                        case CardPatternType2.BOMB_LARGE: return 11;
                        default: return 0;
                    }
                })();

                if (count < neededCards) continue;

                // 检查是否比上家大（priority越小=炸弹越好）
                // 只有当上家也是炸弹时才进行优先级比较
                const bombPriority = getBombPriorityIndex(bombType);
                if (lastPriority >= 0 && bombPriority > lastPriority) continue;

                const bombPrimaryValue = (() => {
                    switch (bombType) {
                        case CardPatternType2.BOMB_SMALL: return 1 * 100 + rank;
                        case CardPatternType2.BOMB_MEDIUM_SMALL: return 2 * 100 + rank;
                        case CardPatternType2.BOMB_MEDIUM: return 3 * 100 + rank;
                        case CardPatternType2.BOMB_MEDIUM_LARGE: return 4 * 100 + rank;
                        case CardPatternType2.BOMB_LARGE: return 5 * 100 + rank;
                        default: return 0;
                    }
                })();

                if (bombPriority === lastPriority && bombPrimaryValue <= lastPrimaryValue) continue;

                moves.push({
                    cards: rankCards.slice(0, neededCards),
                    pattern: { type: bombType as unknown as CardPatternType, primaryValue: bombPrimaryValue, secondaryValue: neededCards },
                    playerId,
                });

                // 如果有更多同点数的牌，也要生成（如同rank有6张，应生成5张和6张两种炸弹）
                if (count > neededCards) {
                    const extraPrimaryValue = bombPrimaryValue; // 同rank的炸弹primaryValue相同
                    moves.push({
                        cards: rankCards.slice(0, count),
                        pattern: { type: bombType as unknown as CardPatternType, primaryValue: extraPrimaryValue, secondaryValue: count },
                        playerId,
                    });
                }
            }
        }
    }

    /**
     * 生成所有合法出牌（开局时使用）
     */
    static generateAllValidMoves(hand: Hand, playerId: number): Move[] {
        const moves: Move[] = [];
        const rankCounts = hand.getRankCounts();

        // ---- 单张 ----
        for (const card of hand.cards) {
            moves.push({
                cards: [card],
                pattern: { type: CardPatternType.SINGLE, primaryValue: card.rank },
                playerId,
            });
        }

        // ---- 对子 ----
        for (const [rank, count] of rankCounts) {
            if (count >= 2) {
                const rankCards = hand.getCardsByRank(rank);
                moves.push({
                    cards: [rankCards[0], rankCards[1]],
                    pattern: { type: CardPatternType.PAIR, primaryValue: rank },
                    playerId,
                });
            }
        }

        // ---- 三张 ----
        for (const [rank, count] of rankCounts) {
            if (count >= 3) {
                const rankCards = hand.getCardsByRank(rank);
                moves.push({
                    cards: [rankCards[0], rankCards[1], rankCards[2]],
                    pattern: { type: CardPatternType.TRIPLE, primaryValue: rank },
                    playerId,
                });
            }
        }

        // ---- 炸弹（各种级别）----
        this.addAllBombs(hand, playerId, moves);

        // ---- 三带一 ----
        for (const [tripleRank, tripleCount] of rankCounts) {
            if (tripleCount >= 3) {
                const tripleCards = hand.getCardsByRank(tripleRank);
                const remainingCards = hand.cards.filter(c => c.rank !== tripleRank);
                for (const singleCard of remainingCards) {
                    moves.push({
                        cards: [tripleCards[0], tripleCards[1], tripleCards[2], singleCard],
                        pattern: { type: CardPatternType.TRIPLE_SINGLE, primaryValue: tripleRank },
                        playerId,
                    });
                }
            }
        }

        // ---- 三带二 ----
        for (const [tripleRank, tripleCount] of rankCounts) {
            if (tripleCount >= 3) {
                const tripleCards = hand.getCardsByRank(tripleRank);
                for (const [pairRank, pairCount] of rankCounts) {
                    if (pairCount >= 2 && pairRank !== tripleRank) {
                        const pairCards = hand.getCardsByRank(pairRank);
                        moves.push({
                            cards: [tripleCards[0], tripleCards[1], tripleCards[2], pairCards[0], pairCards[1]],
                            pattern: { type: CardPatternType.TRIPLE_PAIR, primaryValue: tripleRank },
                            playerId,
                        });
                    }
                }
            }
        }

        // ---- 顺子 ----
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT, primaryValue: 0 }, 0, playerId, moves, true);

        // ---- 连对 ----
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_PAIRS, primaryValue: 0 }, 0, playerId, moves, true);

        // ---- 飞机不带翅膀 ----
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // ---- 飞机带单翅膀 ----
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // ---- 飞机带对翅膀 ----
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // ---- 王炸（开局时所有王炸都可以出）----
        this.addRocketMoves(hand, null, playerId, moves);

        return moves;
    }

    /**
     * 添加所有炸弹（各种级别）
     */
    private static addAllBombs(hand: Hand, playerId: number, moves: Move[]): void {
        const rankCounts = hand.getRankCounts();

        for (const [rank, count] of rankCounts) {
            // 王不能组成炸弹
            if (rank === CardRank.SMALL_JOKER || rank === CardRank.BIG_JOKER) continue;

            const rankCards = hand.getCardsByRank(rank);

            // 4张 = 小炸弹
            if (count >= 4) {
                moves.push({
                    cards: rankCards.slice(0, 4),
                    pattern: { type: CardPatternType2.BOMB_SMALL as unknown as CardPatternType, primaryValue: 1 * 100 + rank, secondaryValue: 4 },
                    playerId,
                });
            }

            // 5-6张 = 中小炸弹
            if (count >= 5) {
                const size = Math.min(count, 6);
                moves.push({
                    cards: rankCards.slice(0, size),
                    pattern: { type: CardPatternType2.BOMB_MEDIUM_SMALL as unknown as CardPatternType, primaryValue: 2 * 100 + rank, secondaryValue: size },
                    playerId,
                });
            }

            // 7-8张 = 中炸弹
            if (count >= 7) {
                const size = Math.min(count, 8);
                moves.push({
                    cards: rankCards.slice(0, size),
                    pattern: { type: CardPatternType2.BOMB_MEDIUM as unknown as CardPatternType, primaryValue: 3 * 100 + rank, secondaryValue: size },
                    playerId,
                });
            }

            // 9-10张 = 中大炸弹
            if (count >= 9) {
                const size = Math.min(count, 10);
                moves.push({
                    cards: rankCards.slice(0, size),
                    pattern: { type: CardPatternType2.BOMB_MEDIUM_LARGE as unknown as CardPatternType, primaryValue: 4 * 100 + rank, secondaryValue: size },
                    playerId,
                });
            }

            // 11-12张 = 大炸弹
            if (count >= 11) {
                const size = Math.min(count, 12);
                moves.push({
                    cards: rankCards.slice(0, size),
                    pattern: { type: CardPatternType2.BOMB_LARGE as unknown as CardPatternType, primaryValue: 5 * 100 + rank, secondaryValue: size },
                    playerId,
                });
            }
        }
    }

    /**
     * 生成顺子类出牌
     */
    private static generateStraightMoves(
        hand: Hand,
        lastPattern: PatternResult,
        lastCardCount: number,
        playerId: number,
        moves: Move[],
        allowAnyLength: boolean = false
    ): void {
        const distinctRanks = hand.getDistinctRanks().filter(r => r < CardRank.TWO);
        distinctRanks.sort((a, b) => a - b);

        if (distinctRanks.length < 2) return;

        const patternType = lastPattern.type;
        const cardsPerGroup = patternType === CardPatternType.STRAIGHT_PAIRS ? 2 :
            patternType === CardPatternType.STRAIGHT_TRIPLES ||
            patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR ? 3 : 1;

        const minGroups = patternType === CardPatternType.STRAIGHT ? 5 :
            patternType === CardPatternType.STRAIGHT_PAIRS ? 3 : 2;

        for (let start = 0; start < distinctRanks.length; start++) {
            for (let end = start + minGroups - 1; end < distinctRanks.length; end++) {
                let isConsecutive = true;
                for (let i = start + 1; i <= end; i++) {
                    if (distinctRanks[i] !== distinctRanks[i - 1] + 1) {
                        isConsecutive = false;
                        break;
                    }
                }

                if (!isConsecutive) continue;

                const straightLength = end - start + 1;
                const straightRanks = distinctRanks.slice(start, end + 1);

                let canForm = true;
                for (const rank of straightRanks) {
                    if (hand.countRank(rank) < cardsPerGroup) {
                        canForm = false;
                        break;
                    }
                }

                if (!canForm) continue;

                const maxRank = straightRanks[straightRanks.length - 1];
                if (!allowAnyLength && maxRank <= lastPattern.primaryValue) {
                    continue;
                }

                const straightCards: Card[] = [];
                for (const rank of straightRanks) {
                    const rankCards = hand.getCardsByRank(rank).slice(0, cardsPerGroup);
                    straightCards.push(...rankCards);
                }

                // 飞机带翅膀
                const isWingsSingle = patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE;
                const isWingsPair = patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;

                if (isWingsSingle || isWingsPair) {
                    const wingCount = straightLength;
                    const straightUsedCards = new Set<number>();

                    for (const rank of straightRanks) {
                        const cards = hand.getCardsByRank(rank);
                        for (let i = 0; i < 3; i++) {
                            straightUsedCards.add(cards[i].id);
                        }
                    }

                    const availableForWings = hand.cards.filter(c => !straightUsedCards.has(c.id));

                    if (isWingsPair) {
                        const pairs: Card[][] = [];
                        const allCardsByRank = new Map<number, Card[]>();
                        for (const card of hand.cards) {
                            if (!allCardsByRank.has(card.rank)) {
                                allCardsByRank.set(card.rank, []);
                            }
                            allCardsByRank.get(card.rank)!.push(card);
                        }
                        for (const [, cards] of allCardsByRank) {
                            const availableCards = cards.filter(c => !straightUsedCards.has(c.id));
                            if (availableCards.length >= 2) {
                                pairs.push([availableCards[0], availableCards[1]]);
                            }
                        }

                        if (pairs.length >= wingCount) {
                            this.generatePairWingCombinations(
                                pairs, wingCount, straightCards, patternType, maxRank,
                                straightLength, lastCardCount, allowAnyLength, playerId, moves
                            );
                        }
                    } else {
                        if (availableForWings.length >= wingCount) {
                            this.generateSingleWingCombinations(
                                availableForWings, wingCount, straightCards, patternType, maxRank,
                                straightLength, lastCardCount, allowAnyLength, playerId, moves
                            );
                        }
                    }
                } else {
                    if (straightCards.length === lastCardCount || allowAnyLength) {
                        moves.push({
                            cards: straightCards,
                            pattern: { type: patternType, primaryValue: maxRank, secondaryValue: straightLength },
                            playerId,
                        });
                    }
                }
            }
        }
    }

    /**
     * 生成对子翅膀组合
     */
    private static generatePairWingCombinations(
        allPairs: Card[][],
        wingCount: number,
        straightCards: Card[],
        patternType: CardPatternType,
        maxRank: number,
        straightLength: number,
        lastCardCount: number,
        allowAnyLength: boolean,
        playerId: number,
        moves: Move[]
    ): void {
        this.combinePairs(allPairs, wingCount, [], straightCards, patternType, maxRank, straightLength, lastCardCount, allowAnyLength, playerId, moves);
    }

    private static combinePairs(
        allPairs: Card[][],
        wingCount: number,
        selectedPairs: Card[][],
        straightCards: Card[],
        patternType: CardPatternType,
        maxRank: number,
        straightLength: number,
        lastCardCount: number,
        allowAnyLength: boolean,
        playerId: number,
        moves: Move[]
    ): void {
        if (selectedPairs.length === wingCount) {
            const wingCards: Card[] = [];
            for (const pair of selectedPairs) {
                wingCards.push(...pair);
            }
            const newCards = [...straightCards, ...wingCards];
            if (newCards.length === lastCardCount || allowAnyLength) {
                moves.push({
                    cards: newCards,
                    pattern: { type: patternType, primaryValue: maxRank, secondaryValue: straightLength },
                    playerId,
                });
            }
            return;
        }

        for (let i = 0; i < allPairs.length; i++) {
            this.combinePairs(
                allPairs.slice(i + 1), wingCount,
                [...selectedPairs, allPairs[i]],
                straightCards, patternType, maxRank, straightLength,
                lastCardCount, allowAnyLength, playerId, moves
            );
        }
    }

    /**
     * 生成单张翅膀组合
     */
    private static generateSingleWingCombinations(
        availableCards: Card[],
        wingCount: number,
        straightCards: Card[],
        patternType: CardPatternType,
        maxRank: number,
        straightLength: number,
        lastCardCount: number,
        allowAnyLength: boolean,
        playerId: number,
        moves: Move[]
    ): void {
        this.combineSingles(availableCards, wingCount, [], straightCards, patternType, maxRank, straightLength, lastCardCount, allowAnyLength, playerId, moves);
    }

    private static combineSingles(
        availableCards: Card[],
        wingCount: number,
        selectedSingles: Card[],
        straightCards: Card[],
        patternType: CardPatternType,
        maxRank: number,
        straightLength: number,
        lastCardCount: number,
        allowAnyLength: boolean,
        playerId: number,
        moves: Move[]
    ): void {
        if (selectedSingles.length === wingCount) {
            const newCards = [...straightCards, ...selectedSingles];
            if (newCards.length === lastCardCount || allowAnyLength) {
                moves.push({
                    cards: newCards,
                    pattern: { type: patternType, primaryValue: maxRank, secondaryValue: straightLength },
                    playerId,
                });
            }
            return;
        }

        for (let i = 0; i < availableCards.length; i++) {
            this.combineSingles(
                availableCards.slice(i + 1), wingCount,
                [...selectedSingles, availableCards[i]],
                straightCards, patternType, maxRank, straightLength,
                lastCardCount, allowAnyLength, playerId, moves
            );
        }
    }

    /**
     * 识别牌型（使用 CardPatternRecognizer2）
     */
    static recognizePattern(cards: Card[]): PatternResult {
        return CardPatternRecognizer2.recognize(cards) || { type: CardPatternType.INVALID, primaryValue: 0 };
    }
}
