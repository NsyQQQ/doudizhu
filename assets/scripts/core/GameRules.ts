/**
 * 游戏规则 - 出牌比较、合法出牌生成
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardRank, CardPatternType, PatternResult, getCardDisplayChar } from './Card';
import { Hand } from './Hand';
import { Move } from './Move';

/** 游戏规则类 */
export class GameRules {
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

        // 火箭最大
        if (patternA.type === CardPatternType.ROCKET) return true;
        if (patternB.type === CardPatternType.ROCKET) return false;

        // 炸弹
        if (patternA.type === CardPatternType.BOMB) {
            if (patternB.type === CardPatternType.BOMB) {
                // 同数量炸弹比大小
                return patternA.primaryValue > patternB.primaryValue;
            }
            return true; // 炸弹压非炸弹
        }
        if (patternB.type === CardPatternType.BOMB) return false;

        // 飞机带翅膀可以压飞机（数量不同但飞机部分能压过）
        const isPlaneA = patternA.type === CardPatternType.STRAIGHT_TRIPLES ||
            patternA.type === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            patternA.type === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;
        const isPlaneB = patternB.type === CardPatternType.STRAIGHT_TRIPLES ||
            patternB.type === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            patternB.type === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;

        if (isPlaneA && isPlaneB) {
            // 飞机之间比较，只比较主值（三张部分的点数）
            return patternA.primaryValue > patternB.primaryValue;
        }

        // 其他牌型必须类型相同才能压
        if (patternA.type !== patternB.type) return false;

        // 必须数量相同
        if (moveA.cards.length !== moveB.cards.length) return false;

        // 比较主值（点数）
        return patternA.primaryValue > patternB.primaryValue;
    }

    /**
     * 从手牌中生成所有能压过 lastMove 的合法出牌
     * @param hand 手牌
     * @param lastMove 上家的出牌（null 表示可以出任意合法牌）
     * @param playerId 当前玩家ID
     * @returns 合法出牌数组
     */
    static generateValidMoves(hand: Hand, lastMove: Move | null, playerId: number): Move[] {
        const moves: Move[] = [];

        // 如果没有参考动作，可以出任意合法牌
        if (!lastMove || lastMove.cards.length === 0) {
            return this.generateAllValidMoves(hand, playerId);
        }

        // 否则尝试找出能压的牌
        const lastPattern = lastMove.pattern;
        const lastCardCount = lastMove.cards.length;

        // 生成所有组合尝试压牌
        // 效率优化：按点数分组
        const rankCounts = hand.getRankCounts();

        // 根据上一手的牌型尝试
        switch (lastPattern.type) {
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
                // 王炸可以打任何单张
                if (hand.hasRocket()) {
                    const rocketCards = hand.cards.filter(c => c.rank === CardRank.SMALL_JOKER || c.rank === CardRank.BIG_JOKER);
                    moves.push({
                        cards: rocketCards,
                        pattern: { type: CardPatternType.ROCKET, primaryValue: CardRank.BIG_JOKER },
                        playerId,
                    });
                }
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
                break;

            case CardPatternType.TRIPLE_SINGLE:
                // 三带一：核心三张要比上家大
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        const remainingCards = hand.cards.filter(c => c.rank !== tripleRank);
                        // 尝试带任意单张
                        for (const singleCard of remainingCards) {
                            moves.push({
                                cards: [tripleCards[0], tripleCards[1], tripleCards[2], singleCard],
                                pattern: { type: CardPatternType.TRIPLE_SINGLE, primaryValue: tripleRank },
                                playerId,
                            });
                        }
                    }
                }
                break;

            case CardPatternType.TRIPLE_PAIR:
                // 三带二
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        // 找所有对子
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
                break;

            case CardPatternType.STRAIGHT:
            case CardPatternType.STRAIGHT_PAIRS:
            case CardPatternType.STRAIGHT_TRIPLES:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR:
                // 顺子类：长度必须相同
                this.generateStraightMoves(hand, lastPattern, lastCardCount, playerId, moves);
                break;

            case CardPatternType.BOMB:
                // 炸弹
                for (const [rank, count] of rankCounts) {
                    if (count >= 4 && rank > lastPattern.primaryValue) {
                        const rankCards = hand.getCardsByRank(rank);
                        moves.push({
                            cards: [rankCards[0], rankCards[1], rankCards[2], rankCards[3]],
                            pattern: { type: CardPatternType.BOMB, primaryValue: rank },
                            playerId,
                        });
                    }
                }
                break;

            case CardPatternType.QUADRUPLE_SINGLE:
                // 四带两单
                for (const [quadRank, quadCount] of rankCounts) {
                    if (quadCount >= 4 && quadRank > lastPattern.primaryValue) {
                        const quadCards = hand.getCardsByRank(quadRank);
                        const remainingCards = hand.cards.filter(c => c.rank !== quadRank);
                        // 组合两单
                        for (let i = 0; i < remainingCards.length; i++) {
                            for (let j = i + 1; j < remainingCards.length; j++) {
                                moves.push({
                                    cards: [quadCards[0], quadCards[1], quadCards[2], quadCards[3], remainingCards[i], remainingCards[j]],
                                    pattern: { type: CardPatternType.QUADRUPLE_SINGLE, primaryValue: quadRank },
                                    playerId,
                                });
                            }
                        }
                    }
                }
                break;

            case CardPatternType.QUADRUPLE_PAIR:
                // 四带两对
                for (const [quadRank, quadCount] of rankCounts) {
                    if (quadCount >= 4 && quadRank > lastPattern.primaryValue) {
                        const quadCards = hand.getCardsByRank(quadRank);
                        // 找两个不同的对子
                        const pairs: Card[] = [];
                        for (const [pairRank, pairCount] of rankCounts) {
                            if (pairCount >= 2 && pairRank !== quadRank) {
                                const pairCards = hand.getCardsByRank(pairRank);
                                pairs.push(pairCards[0], pairCards[1]);
                            }
                        }
                        if (pairs.length >= 4) {
                            for (let i = 0; i < pairs.length; i += 2) {
                                for (let j = i + 2; j < pairs.length; j += 2) {
                                    moves.push({
                                        cards: [quadCards[0], quadCards[1], quadCards[2], quadCards[3], pairs[i], pairs[i + 1], pairs[j], pairs[j + 1]],
                                        pattern: { type: CardPatternType.QUADRUPLE_PAIR, primaryValue: quadRank },
                                        playerId,
                                    });
                                }
                            }
                        }
                    }
                }
                break;
        }

        // 火箭可以打任何非火箭的牌
        if (hand.hasRocket()) {
            const rocketCards = hand.cards.filter(c => c.rank === CardRank.SMALL_JOKER || c.rank === CardRank.BIG_JOKER);
            moves.push({
                cards: rocketCards,
                pattern: { type: CardPatternType.ROCKET, primaryValue: CardRank.BIG_JOKER },
                playerId,
            });
        }

        // 炸弹可以打任何非火箭的牌（炸弹之间需要比大小）
        if (lastPattern.type !== CardPatternType.BOMB && lastPattern.type !== CardPatternType.ROCKET) {
            for (const [rank, count] of rankCounts) {
                if (count >= 4) {
                    const rankCards = hand.getCardsByRank(rank);
                    moves.push({
                        cards: [rankCards[0], rankCards[1], rankCards[2], rankCards[3]],
                        pattern: { type: CardPatternType.BOMB, primaryValue: rank },
                        playerId,
                    });
                }
            }
        }

        return moves;
    }

    /**
     * 生成所有合法出牌（开局时使用）
     */
    static generateAllValidMoves(hand: Hand, playerId: number): Move[] {
        const moves: Move[] = [];
        const cards = hand.cards;


        // 单张
        for (const card of cards) {
            moves.push({
                cards: [card],
                pattern: { type: CardPatternType.SINGLE, primaryValue: card.rank },
                playerId,
            });
        }

        // 对子
        const rankCounts = hand.getRankCounts();
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

        // 三张
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

        // 炸弹
        for (const [rank, count] of rankCounts) {
            if (count >= 4) {
                const rankCards = hand.getCardsByRank(rank);
                moves.push({
                    cards: [rankCards[0], rankCards[1], rankCards[2], rankCards[3]],
                    pattern: { type: CardPatternType.BOMB, primaryValue: rank },
                    playerId,
                });
            }
        }

        // 三带一
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

        // 三带二
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

        // 顺子
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT, primaryValue: 0 }, 0, playerId, moves, true);

        // 连对
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_PAIRS, primaryValue: 0 }, 0, playerId, moves, true);

        // 飞机不带翅膀
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // 飞机带单翅膀
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // 飞机带对翅膀
        this.generateStraightMoves(hand, { type: CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR, primaryValue: 0, secondaryValue: 2 }, 0, playerId, moves, true);

        // 火箭
        if (hand.hasRocket()) {
            const rocketCards = hand.cards.filter(c => c.rank === CardRank.SMALL_JOKER || c.rank === CardRank.BIG_JOKER);
            moves.push({
                cards: rocketCards,
                pattern: { type: CardPatternType.ROCKET, primaryValue: CardRank.BIG_JOKER },
                playerId,
            });
        }

        // 四带两单
        for (const [quadRank, quadCount] of rankCounts) {
            if (quadCount >= 4) {
                const quadCards = hand.getCardsByRank(quadRank);
                const remainingCards = hand.cards.filter(c => c.rank !== quadRank);
                for (let i = 0; i < remainingCards.length; i++) {
                    for (let j = i + 1; j < remainingCards.length; j++) {
                        moves.push({
                            cards: [quadCards[0], quadCards[1], quadCards[2], quadCards[3], remainingCards[i], remainingCards[j]],
                            pattern: { type: CardPatternType.QUADRUPLE_SINGLE, primaryValue: quadRank },
                            playerId,
                        });
                    }
                }
            }
        }

        // 四带两对
        for (const [quadRank, quadCount] of rankCounts) {
            if (quadCount >= 4) {
                const quadCards = hand.getCardsByRank(quadRank);
                // 找所有对子
                const pairs: Card[][] = [];
                for (const [rank, count] of rankCounts) {
                    if (count >= 2 && rank !== quadRank) {
                        const rankCards = hand.getCardsByRank(rank);
                        pairs.push([rankCards[0], rankCards[1]]);
                    }
                }
                // 组合两对
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        moves.push({
                            cards: [...quadCards.slice(0, 4), ...pairs[i], ...pairs[j]],
                            pattern: { type: CardPatternType.QUADRUPLE_PAIR, primaryValue: quadRank },
                            playerId,
                        });
                    }
                }
            }
        }

        return moves;
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
        const rankArray = Array.from(hand.getDistinctRanks());
        const distinctRanks = rankArray.filter(r => r < CardRank.TWO);
        distinctRanks.sort((a, b) => a - b);

        if (distinctRanks.length < 2) {
            return;
        }

        // 确定类型和每组所需牌数
        const patternType = lastPattern.type;
        const cardsPerGroup = patternType === CardPatternType.STRAIGHT_PAIRS ? 2 :
            patternType === CardPatternType.STRAIGHT_TRIPLES ||
            patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE ||
            patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR ? 3 : 1;

        // 最小顺子长度（按组数计）：顺子5、连对3、飞机2
        const minGroups = patternType === CardPatternType.STRAIGHT ? 5 :
            patternType === CardPatternType.STRAIGHT_PAIRS ? 3 : 2;

        // 生成所有可能的顺子
        for (let start = 0; start < distinctRanks.length; start++) {
            for (let end = start + minGroups - 1; end < distinctRanks.length; end++) {
                // 必须是连续的
                let isConsecutive = true;
                for (let i = start + 1; i <= end; i++) {
                    if (distinctRanks[i] !== distinctRanks[i - 1] + 1) {
                        isConsecutive = false;
                        break;
                    }
                }

                if (!isConsecutive) continue;

                const straightLength = end - start + 1;

                // 检查是否有足够的所有点数的牌
                let canForm = true;
                const straightRanks = distinctRanks.slice(start, end + 1);
                for (const rank of straightRanks) {
                    if (hand.countRank(rank) < cardsPerGroup) {
                        canForm = false;
                        break;
                    }
                }

                if (!canForm) continue;

                // 检查是否比上家大（如果有上家）
                if (!allowAnyLength && straightLength !== (lastPattern.secondaryValue || 0)) {
                    continue;
                }

                const maxRank = straightRanks[straightRanks.length - 1];
                if (!allowAnyLength && maxRank <= lastPattern.primaryValue) {
                    continue;
                }

                // 必须满足最小组数要求
                if (straightLength < minGroups) continue;

                // 判断是否是飞机带翅膀
                const isWingsSingle = patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE;
                const isWingsPair = patternType === CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR;

                // 构建出牌
                // 飞机本体每组3张，翅膀另外配
                const cardsPerStraightRank = cardsPerGroup;
                const straightCards: Card[] = [];
                for (const rank of straightRanks) {
                    const rankCards = hand.getCardsByRank(rank).slice(0, cardsPerStraightRank);
                    straightCards.push(...rankCards);
                }

                // 如果是飞机带翅膀，添加翅膀
                if (isWingsSingle || isWingsPair) {
                    const wingCount = straightLength; // 翅膀数量 = 三张组数

                    // 收集所有单牌（按rank分组）
                    const allCardsByRank = new Map<number, Card[]>();
                    for (const card of hand.cards) {
                        if (!allCardsByRank.has(card.rank)) {
                            allCardsByRank.set(card.rank, []);
                        }
                        allCardsByRank.get(card.rank)!.push(card);
                    }

                    // 确定哪些rank用于三顺，哪些用于翅膀
                    // 三顺需要每组3张，翅膀需要每组2张（对子）或1张（单张）
                    // 优先使用不在三顺中的rank作为翅膀

                    // 计算三顺实际用了哪些牌
                    // 飞机本体用3张，翅膀另外从剩余牌中配对
                    const straightUsedCards = new Set<number>();
                    for (const rank of straightRanks) {
                        const cards = hand.getCardsByRank(rank);
                        // 三顺用3张
                        for (let i = 0; i < 3; i++) {
                            straightUsedCards.add(cards[i].id);
                        }
                    }

                    // 收集所有可用作翅膀的牌（不在三顺中的）
                    const availableForWings = hand.cards.filter(c => !straightUsedCards.has(c.id));

                    if (isWingsPair) {
                        // 生成所有可能的对子组合
                        // 只从可用牌中取对（不在三顺中使用的牌）
                        const pairs: Card[][] = [];
                        for (const [, cards] of allCardsByRank) {
                            // 找出这个rank中哪些牌不在straightUsedCards中
                            const availableCards = cards.filter(c => !straightUsedCards.has(c.id));
                            if (availableCards.length >= 2) {
                                pairs.push([availableCards[0], availableCards[1]]);
                            }
                        }

                        if (pairs.length >= wingCount) {
                            // 生成所有翅膀组合（从所有对子中选wingCount个）
                            this.generatePairWingCombinations(
                                pairs, wingCount,
                                straightCards, patternType, maxRank, straightLength,
                                lastCardCount, allowAnyLength, playerId, moves
                            );
                        }
                    } else {
                        // 单翅膀：生成所有可能的单张翅膀组合
                        if (availableForWings.length >= wingCount) {
                            // 生成所有翅膀组合（从availableForWings中选wingCount张的不同组合）
                            this.generateSingleWingCombinations(
                                availableForWings, wingCount,
                                straightCards, patternType, maxRank, straightLength,
                                lastCardCount, allowAnyLength, playerId, moves
                            );
                        }
                    }
                }

                // 非翅膀情况：直接添加顺子
                if (!isWingsSingle && !isWingsPair) {
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
     * 生成对子翅膀的所有可能组合（支持从任何rank拆对子）
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
        // 生成所有从allPairs中选wingCount对的组合
        this.combinePairs(allPairs, wingCount, [], straightCards, patternType, maxRank, straightLength, lastCardCount, allowAnyLength, playerId, moves);
    }

    /**
     * 递归组合对子
     */
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
            // 选够了，创建最终牌组
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

        // 递归选择更多对子
        for (let i = 0; i < allPairs.length; i++) {
            this.combinePairs(
                allPairs.slice(i + 1),
                wingCount,
                [...selectedPairs, allPairs[i]],
                straightCards,
                patternType,
                maxRank,
                straightLength,
                lastCardCount,
                allowAnyLength,
                playerId,
                moves
            );
        }
    }

    /**
     * 生成单张翅膀的所有可能组合
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
        // 生成所有从availableCards中选wingCount张的组合
        this.combineSingles(availableCards, wingCount, [], straightCards, patternType, maxRank, straightLength, lastCardCount, allowAnyLength, playerId, moves);
    }

    /**
     * 递归组合单张
     */
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
            // 选够了，创建最终牌组
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

        // 递归选择更多单张
        for (let i = 0; i < availableCards.length; i++) {
            this.combineSingles(
                availableCards.slice(i + 1),
                wingCount,
                [...selectedSingles, availableCards[i]],
                straightCards,
                patternType,
                maxRank,
                straightLength,
                lastCardCount,
                allowAnyLength,
                playerId,
                moves
            );
        }
    }

    /**
     * 识别牌型
     */
    static recognizePattern(cards: Card[]): PatternResult {
        if (cards.length === 0) {
            return { type: CardPatternType.INVALID, primaryValue: 0 };
        }

        // 获取基本统计信息
        const rankCounts = new Map<CardRank, number>();
        let maxRank = CardRank.THREE;

        for (const card of cards) {
            const count = rankCounts.get(card.rank) || 0;
            rankCounts.set(card.rank, count + 1);
            if (card.rank > maxRank) maxRank = card.rank;
        }

        const countValues = Array.from(rankCounts.values()).sort((a, b) => b - a);
        const cardCount = cards.length;
        const uniqueRanks = rankCounts.size;

        // 王炸
        if (cardCount === 2) {
            const hasSmallJoker = rankCounts.get(CardRank.SMALL_JOKER) === 1;
            const hasBigJoker = rankCounts.get(CardRank.BIG_JOKER) === 1;
            if (hasSmallJoker && hasBigJoker) {
                return { type: CardPatternType.ROCKET, primaryValue: CardRank.BIG_JOKER };
            }
        }

        // 单张
        if (cardCount === 1) {
            return { type: CardPatternType.SINGLE, primaryValue: maxRank };
        }

        // 对子
        if (cardCount === 2 && countValues[0] === 2) {
            return { type: CardPatternType.PAIR, primaryValue: maxRank };
        }

        // 三张
        if (cardCount === 3 && countValues[0] === 3) {
            return { type: CardPatternType.TRIPLE, primaryValue: maxRank };
        }

        // 炸弹
        if (cardCount === 4 && countValues[0] === 4) {
            return { type: CardPatternType.BOMB, primaryValue: maxRank };
        }

        // 三带一
        if (cardCount === 4 && countValues[0] === 3 && countValues[1] === 1) {
            return { type: CardPatternType.TRIPLE_SINGLE, primaryValue: maxRank };
        }

        // 三带一对
        if (cardCount === 5 && countValues[0] === 3 && countValues[1] === 2) {
            return { type: CardPatternType.TRIPLE_PAIR, primaryValue: maxRank };
        }

        // 四带两张单牌
        if (cardCount === 6 && countValues[0] === 4) {
            return { type: CardPatternType.QUADRUPLE_SINGLE, primaryValue: maxRank, secondaryValue: 2 };
        }

        // 四带两对
        if (cardCount === 8 && countValues[0] === 4 && countValues[1] === 2 && countValues[2] === 2) {
            return { type: CardPatternType.QUADRUPLE_PAIR, primaryValue: maxRank, secondaryValue: 2 };
        }

        // 顺子
        if (cardCount >= 5 && uniqueRanks === cardCount && countValues[0] === 1) {
            // 检查是否是连续的点
            let isConsecutive = true;
            const ranks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= CardRank.TWO) {
                return { type: CardPatternType.STRAIGHT, primaryValue: maxRank, secondaryValue: cardCount };
            }
        }

        // 连对
        if (cardCount >= 6 && cardCount % 2 === 0 && countValues[0] === 2 && countValues.every(c => c === 2)) {
            let isConsecutive = true;
            const ranks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= CardRank.TWO) {
                return { type: CardPatternType.STRAIGHT_PAIRS, primaryValue: maxRank, secondaryValue: cardCount / 2 };
            }
        }

        // 飞机（不带翅膀）
        if (cardCount >= 6 && cardCount % 3 === 0 && countValues.every(c => c === 3)) {
            let isConsecutive = true;
            const ranks = Array.from(rankCounts.keys()).sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= CardRank.TWO) {
                return { type: CardPatternType.STRAIGHT_TRIPLES, primaryValue: maxRank, secondaryValue: cardCount / 3 };
            }
        }

        return { type: CardPatternType.INVALID, primaryValue: 0 };
    }
}
