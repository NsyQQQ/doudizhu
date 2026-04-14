"use strict";
/**
 * 6人斗地主游戏规则（3副牌）
 * 新牌型：多种炸弹牌型、王炸牌型，去除四带二
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRules2 = exports.Hand2 = exports.CardPatternType2 = void 0;
const types_1 = require("./types");
/** 六人场专用牌型 */
var CardPatternType2;
(function (CardPatternType2) {
    CardPatternType2[CardPatternType2["PASS"] = -1] = "PASS";
    CardPatternType2[CardPatternType2["INVALID"] = 0] = "INVALID";
    CardPatternType2[CardPatternType2["SINGLE"] = 1] = "SINGLE";
    CardPatternType2[CardPatternType2["PAIR"] = 2] = "PAIR";
    CardPatternType2[CardPatternType2["TRIPLE"] = 3] = "TRIPLE";
    CardPatternType2[CardPatternType2["TRIPLE_SINGLE"] = 4] = "TRIPLE_SINGLE";
    CardPatternType2[CardPatternType2["TRIPLE_PAIR"] = 5] = "TRIPLE_PAIR";
    CardPatternType2[CardPatternType2["STRAIGHT"] = 6] = "STRAIGHT";
    CardPatternType2[CardPatternType2["STRAIGHT_PAIRS"] = 7] = "STRAIGHT_PAIRS";
    CardPatternType2[CardPatternType2["STRAIGHT_TRIPLES"] = 8] = "STRAIGHT_TRIPLES";
    CardPatternType2[CardPatternType2["STRAIGHT_TRIPLES_WITH_WINGS_SINGLE"] = 9] = "STRAIGHT_TRIPLES_WITH_WINGS_SINGLE";
    CardPatternType2[CardPatternType2["STRAIGHT_TRIPLES_WITH_WINGS_PAIR"] = 10] = "STRAIGHT_TRIPLES_WITH_WINGS_PAIR";
    // ---- 炸弹牌型（同类型按点数比较）----
    // 4炸: 4张同点数
    CardPatternType2[CardPatternType2["BOMB_four"] = 20] = "BOMB_four";
    // 王炸: 2个小王
    CardPatternType2[CardPatternType2["ROCKET_two_SMALL"] = 21] = "ROCKET_two_SMALL";
    // 王炸: 1个大王+1个小王
    CardPatternType2[CardPatternType2["ROCKET_two_MEDIUM"] = 22] = "ROCKET_two_MEDIUM";
    // 王炸: 2个大王
    CardPatternType2[CardPatternType2["ROCKET_two_LARGE"] = 23] = "ROCKET_two_LARGE";
    // 5炸: 5张同点数
    CardPatternType2[CardPatternType2["BOMB_five"] = 30] = "BOMB_five";
    // 6炸: 6张同点数
    CardPatternType2[CardPatternType2["BOMB_six"] = 31] = "BOMB_six";
    // 王炸: 3个小王
    CardPatternType2[CardPatternType2["ROCKET_three_SMALL"] = 32] = "ROCKET_three_SMALL";
    // 王炸: 1个大王+2个小王
    CardPatternType2[CardPatternType2["ROCKET_three_MEDIUM1"] = 33] = "ROCKET_three_MEDIUM1";
    // 王炸: 2个大王+1个小王
    CardPatternType2[CardPatternType2["ROCKET_three_MEDIUM2"] = 34] = "ROCKET_three_MEDIUM2";
    // 王炸: 3个大王
    CardPatternType2[CardPatternType2["ROCKET_three_LARGE"] = 35] = "ROCKET_three_LARGE";
    // 7炸: 7张同点数
    CardPatternType2[CardPatternType2["BOMB_seven"] = 40] = "BOMB_seven";
    // 8炸: 8张同点数
    CardPatternType2[CardPatternType2["BOMB_eight"] = 41] = "BOMB_eight";
    // 王炸: 4个王
    CardPatternType2[CardPatternType2["ROCKET_four"] = 42] = "ROCKET_four";
    // 9炸弹: 9张同点数
    CardPatternType2[CardPatternType2["BOMB_nine"] = 50] = "BOMB_nine";
    // 10炸: 10张同点数
    CardPatternType2[CardPatternType2["BOMB_ten"] = 51] = "BOMB_ten";
    // 王炸: 5个王
    CardPatternType2[CardPatternType2["ROCKET_five"] = 52] = "ROCKET_five";
    // 11炸: 11张同点数
    CardPatternType2[CardPatternType2["BOMB_eleven"] = 60] = "BOMB_eleven";
    // 12炸: 12张同点数
    CardPatternType2[CardPatternType2["BOMB_twelve"] = 61] = "BOMB_twelve";
    // 王炸: 6个王
    CardPatternType2[CardPatternType2["ROCKET_six"] = 62] = "ROCKET_six";
})(CardPatternType2 || (exports.CardPatternType2 = CardPatternType2 = {}));
/** 六人场炸弹牌型大小排序（从大到小） */
const BOMB_PRIORITY = [
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
/** 是否是炸弹类型 */
function isBombType(type) {
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
/** 是否是王炸类型 */
function isRocketType(type) {
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
/** 获取炸弹优先级索引 */
function getBombPriorityIndex(type) {
    return BOMB_PRIORITY.indexOf(type);
}
/** 服务端手牌管理（6人场） */
class Hand2 {
    constructor(cards = []) {
        this._cards = [];
        this._cards = [...cards];
    }
    get cards() {
        return [...this._cards];
    }
    get count() {
        return this._cards.length;
    }
    get isEmpty() {
        return this._cards.length === 0;
    }
    sortByRankDescending() {
        this._cards.sort((a, b) => b.rank - a.rank);
    }
    addCards(cards) {
        this._cards.push(...cards);
    }
    removeCards(cards) {
        const toRemove = new Set(cards.map(c => c.id));
        this._cards = this._cards.filter(c => !toRemove.has(c.id));
    }
    getCardsByRank(rank) {
        return this._cards.filter(c => c.rank === rank);
    }
    getRankCounts() {
        const counts = new Map();
        for (const card of this._cards) {
            counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
        }
        return counts;
    }
    countRank(rank) {
        return this._cards.filter(c => c.rank === rank).length;
    }
    getDistinctRanks() {
        return [...new Set(this._cards.map(c => c.rank))];
    }
    hasRocket() {
        return this.hasRank(types_1.CardRank.SMALL_JOKER) && this.hasRank(types_1.CardRank.BIG_JOKER);
    }
    hasRank(rank) {
        return this._cards.some(c => c.rank === rank);
    }
    getRankCountList() {
        const counts = this.getRankCounts();
        return Array.from(counts.entries())
            .map(([rank, count]) => ({ rank, count }))
            .sort((a, b) => {
            if (b.count !== a.count)
                return b.count - a.count;
            return b.rank - a.rank;
        });
    }
}
exports.Hand2 = Hand2;
/** 6人斗地主游戏规则（3副牌） */
class GameRules2 {
    /** 识别牌型 */
    static recognizePattern(cards) {
        if (cards.length === 0) {
            return { type: types_1.CardPatternType.INVALID, primaryValue: 0 };
        }
        // ---- 先检测王炸 ----
        const rocketResult = this.recognizeRocket(cards);
        if (rocketResult) {
            return rocketResult;
        }
        const rankCounts = new Map();
        let maxRank = types_1.CardRank.THREE;
        for (const card of cards) {
            const count = rankCounts.get(card.rank) || 0;
            rankCounts.set(card.rank, count + 1);
            if (card.rank > maxRank)
                maxRank = card.rank;
        }
        const countValues = [...rankCounts.values()].sort((a, b) => b - a);
        const cardCount = cards.length;
        const uniqueRanks = rankCounts.size;
        // 单张
        if (cardCount === 1) {
            return { type: types_1.CardPatternType.SINGLE, primaryValue: maxRank };
        }
        // 对子
        if (cardCount === 2 && countValues[0] === 2) {
            return { type: types_1.CardPatternType.PAIR, primaryValue: maxRank };
        }
        // 三张
        if (cardCount === 3 && countValues[0] === 3) {
            return { type: types_1.CardPatternType.TRIPLE, primaryValue: maxRank };
        }
        // ---- 检测炸弹 ----
        const bombResult = this.recognizeBomb(cards, countValues, rankCounts);
        if (bombResult) {
            return bombResult;
        }
        // 三带一
        if (cardCount === 4 && countValues[0] === 3 && countValues[1] === 1) {
            return { type: types_1.CardPatternType.TRIPLE_SINGLE, primaryValue: maxRank };
        }
        // 三带二
        if (cardCount === 5 && countValues[0] === 3 && countValues[1] === 2) {
            return { type: types_1.CardPatternType.TRIPLE_PAIR, primaryValue: maxRank };
        }
        // 顺子
        if (cardCount >= 5 && uniqueRanks === cardCount && countValues[0] === 1) {
            let isConsecutive = true;
            const ranks = [...rankCounts.keys()].sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= types_1.CardRank.TWO) {
                return { type: types_1.CardPatternType.STRAIGHT, primaryValue: maxRank, secondaryValue: cardCount };
            }
        }
        // 连对
        if (cardCount >= 6 && cardCount % 2 === 0 && countValues[0] === 2 && countValues.every(c => c === 2)) {
            let isConsecutive = true;
            const ranks = [...rankCounts.keys()].sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= types_1.CardRank.TWO) {
                return { type: types_1.CardPatternType.STRAIGHT_PAIRS, primaryValue: maxRank, secondaryValue: cardCount / 2 };
            }
        }
        // 飞机
        if (cardCount >= 6 && cardCount % 3 === 0 && countValues.every(c => c === 3)) {
            let isConsecutive = true;
            const ranks = [...rankCounts.keys()].sort((a, b) => a - b);
            for (let i = 0; i < ranks.length - 1; i++) {
                if (ranks[i + 1] - ranks[i] !== 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && maxRank <= types_1.CardRank.TWO) {
                return { type: types_1.CardPatternType.STRAIGHT_TRIPLES, primaryValue: maxRank, secondaryValue: cardCount / 3 };
            }
        }
        // 飞机带翅膀（单翅膀或对翅膀）
        // 找出所有的三张组和非三张组
        const tripleGroups = [];
        const otherGroups = [];
        for (const [rank, count] of rankCounts) {
            if (count >= 3) {
                tripleGroups.push({ rank, count });
            }
            else {
                otherGroups.push({ rank, count });
            }
        }
        if (tripleGroups.length >= 2) {
            // 检查三张组是否连续
            const sortedTriples = [...tripleGroups].sort((a, b) => a.rank - b.rank);
            let isConsecutive = true;
            for (let i = 0; i < sortedTriples.length - 1; i++) {
                if (sortedTriples[i + 1].rank !== sortedTriples[i].rank + 1) {
                    isConsecutive = false;
                    break;
                }
            }
            if (isConsecutive && sortedTriples[sortedTriples.length - 1].rank <= types_1.CardRank.TWO) {
                const tripleCount = sortedTriples.length;
                // 检查翅膀数量是否符合（翅膀数 = 三张组数）
                if (otherGroups.length === tripleCount) {
                    // 检查是单翅膀还是对翅膀
                    const allSingles = otherGroups.every(g => g.count === 1);
                    const allPairs = otherGroups.every(g => g.count === 2);
                    if (allSingles) {
                        // 飞机带单翅膀
                        return {
                            type: CardPatternType2.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE,
                            primaryValue: sortedTriples[tripleCount - 1].rank, // 用最大的三张组的rank作为主值
                            secondaryValue: tripleCount
                        };
                    }
                    if (allPairs) {
                        // 飞机带对翅膀
                        return {
                            type: CardPatternType2.STRAIGHT_TRIPLES_WITH_WINGS_PAIR,
                            primaryValue: sortedTriples[tripleCount - 1].rank,
                            secondaryValue: tripleCount
                        };
                    }
                }
            }
        }
        return { type: types_1.CardPatternType.INVALID, primaryValue: 0 };
    }
    /** 识别王炸 */
    static recognizeRocket(cards) {
        let jokerCount = 0;
        let smallCount = 0;
        let bigCount = 0;
        for (const card of cards) {
            if (card.rank === types_1.CardRank.SMALL_JOKER) {
                jokerCount++;
                smallCount++;
            }
            else if (card.rank === types_1.CardRank.BIG_JOKER) {
                jokerCount++;
                bigCount++;
            }
        }
        // 所有牌都是王
        if (jokerCount !== cards.length) {
            return null;
        }
        // 王炸：张数2-6
        if (jokerCount < 2 || jokerCount > 6) {
            return null;
        }
        const rocketType = (() => {
            switch (jokerCount) {
                case 2: return smallCount >= 2 ? CardPatternType2.ROCKET_two_SMALL :
                    (smallCount >= 1 && bigCount >= 1 ? CardPatternType2.ROCKET_two_MEDIUM : CardPatternType2.ROCKET_two_LARGE);
                case 3: return smallCount >= 3 ? CardPatternType2.ROCKET_three_SMALL :
                    (smallCount >= 2 && bigCount >= 1 ? CardPatternType2.ROCKET_three_MEDIUM1 :
                        (smallCount >= 1 && bigCount >= 2 ? CardPatternType2.ROCKET_three_MEDIUM2 : CardPatternType2.ROCKET_three_LARGE));
                case 4: return CardPatternType2.ROCKET_four;
                case 5: return CardPatternType2.ROCKET_five;
                case 6: return CardPatternType2.ROCKET_six;
                default: return CardPatternType2.INVALID;
            }
        })();
        const primaryValue = (() => {
            switch (jokerCount) {
                case 2: return 1 * 10000;
                case 3: return 2 * 10000;
                case 4: return 3 * 10000;
                case 5: return 4 * 10000;
                case 6: return 5 * 10000;
                default: return 0;
            }
        })();
        return {
            type: rocketType,
            primaryValue,
            secondaryValue: jokerCount
        };
    }
    /** 识别炸弹 */
    static recognizeBomb(cards, _countValues, rankCounts) {
        // 需要所有牌同点数
        if (rankCounts.size !== 1) {
            return null;
        }
        const cardCount = cards.length;
        const rank = cards[0].rank;
        // 炸弹需要4+张
        if (cardCount < 4) {
            return null;
        }
        // 不能是王（王炸单独处理）
        if (rank === types_1.CardRank.SMALL_JOKER || rank === types_1.CardRank.BIG_JOKER) {
            return null;
        }
        const bombType = (() => {
            if (cardCount >= 12)
                return CardPatternType2.BOMB_twelve;
            if (cardCount >= 11)
                return CardPatternType2.BOMB_eleven;
            if (cardCount >= 10)
                return CardPatternType2.BOMB_ten;
            if (cardCount >= 9)
                return CardPatternType2.BOMB_nine;
            if (cardCount >= 8)
                return CardPatternType2.BOMB_eight;
            if (cardCount >= 7)
                return CardPatternType2.BOMB_seven;
            if (cardCount >= 6)
                return CardPatternType2.BOMB_six;
            if (cardCount >= 5)
                return CardPatternType2.BOMB_five;
            return CardPatternType2.BOMB_four;
        })();
        const bombLevel = (() => {
            if (cardCount >= 12)
                return 9;
            if (cardCount >= 11)
                return 8;
            if (cardCount >= 10)
                return 7;
            if (cardCount >= 9)
                return 6;
            if (cardCount >= 8)
                return 5;
            if (cardCount >= 7)
                return 4;
            if (cardCount >= 6)
                return 3;
            if (cardCount >= 5)
                return 2;
            return 1;
        })();
        return {
            type: bombType,
            primaryValue: bombLevel * 100 + rank,
            secondaryValue: cardCount
        };
    }
    /** 判断 moveA 能否压过 moveB */
    static canBeat(moveA, moveB) {
        if (moveA.cards.length === 0) {
            return true;
        }
        if (!moveB || moveB.cards.length === 0) {
            return moveA.pattern.type !== types_1.CardPatternType.INVALID;
        }
        const patternA = moveA.pattern;
        const patternB = moveB.pattern;
        const typeA = patternA.type;
        const typeB = patternB.type;
        // ---- 都是炸弹/王炸 ----
        if ((isBombType(typeA) || isRocketType(typeA)) && (isBombType(typeB) || isRocketType(typeB))) {
            if (typeA !== typeB) {
                // 不同类型：按优先级顺序比较，index 小的赢
                return getBombPriorityIndex(typeA) < getBombPriorityIndex(typeB);
            }
            // 同类型：比较主值（炸弹比点数，火箭比王数量）
            return patternA.primaryValue > patternB.primaryValue;
        }
        // 王炸 vs 一般牌型
        if (isRocketType(typeA))
            return true;
        if (isRocketType(typeB))
            return false;
        // 炸弹 vs 一般牌型
        if (isBombType(typeA))
            return true;
        if (isBombType(typeB))
            return false;
        // 其他牌型必须类型相同
        if (patternA.type !== patternB.type) {
            return false;
        }
        if (moveA.cards.length !== moveB.cards.length) {
            return false;
        }
        return patternA.primaryValue > patternB.primaryValue;
    }
    /** 从手牌生成所有能压过 lastMove 的合法出牌 */
    static generateValidMoves(hand, lastMove, playerId) {
        const moves = [];
        if (!lastMove || lastMove.cards.length === 0) {
            return this.generateAllValidMoves(hand, playerId);
        }
        const lastPattern = lastMove.pattern;
        const lastCardCount = lastMove.cards.length;
        const lastType = lastPattern.type;
        const rankCounts = hand.getRankCounts();
        switch (lastType) {
            case types_1.CardPatternType.SINGLE:
                for (const [rank] of rankCounts) {
                    if (rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        if (cards.length > 0) {
                            moves.push({ cards: [cards[0]], pattern: { type: types_1.CardPatternType.SINGLE, primaryValue: rank }, playerId });
                        }
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
            case types_1.CardPatternType.PAIR:
                for (const [rank, count] of rankCounts) {
                    if (count >= 2 && rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0], cards[1]], pattern: { type: types_1.CardPatternType.PAIR, primaryValue: rank }, playerId });
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
            case types_1.CardPatternType.TRIPLE:
                for (const [rank, count] of rankCounts) {
                    if (count >= 3 && rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0], cards[1], cards[2]], pattern: { type: types_1.CardPatternType.TRIPLE, primaryValue: rank }, playerId });
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
            case types_1.CardPatternType.TRIPLE_SINGLE:
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        const remaining = hand.cards.filter(c => c.rank !== tripleRank);
                        for (const singleCard of remaining) {
                            moves.push({
                                cards: [tripleCards[0], tripleCards[1], tripleCards[2], singleCard],
                                pattern: { type: types_1.CardPatternType.TRIPLE_SINGLE, primaryValue: tripleRank },
                                playerId
                            });
                        }
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
            case types_1.CardPatternType.TRIPLE_PAIR:
                for (const [tripleRank, tripleCount] of rankCounts) {
                    if (tripleCount >= 3 && tripleRank > lastPattern.primaryValue) {
                        const tripleCards = hand.getCardsByRank(tripleRank);
                        for (const [pairRank, pairCount] of rankCounts) {
                            if (pairCount >= 2 && pairRank !== tripleRank) {
                                const pairCards = hand.getCardsByRank(pairRank);
                                moves.push({
                                    cards: [tripleCards[0], tripleCards[1], tripleCards[2], pairCards[0], pairCards[1]],
                                    pattern: { type: types_1.CardPatternType.TRIPLE_PAIR, primaryValue: tripleRank },
                                    playerId
                                });
                            }
                        }
                    }
                }
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
            case types_1.CardPatternType.STRAIGHT:
            case types_1.CardPatternType.STRAIGHT_PAIRS:
            case types_1.CardPatternType.STRAIGHT_TRIPLES:
                this.generateStraightMoves(hand, lastPattern, lastCardCount, playerId, moves);
                this.addRocketMoves(hand, lastMove, playerId, moves);
                this.addBombMoves(hand, lastPattern, playerId, moves);
                break;
        }
        // 处理 CardPatternType2 特有的炸弹/王炸类型
        // 当 lastType 是炸弹或王炸时，需要生成能打过它的炸弹和王炸
        if (isBombType(lastType)) {
            // 更大的炸弹或王炸可以压
            this.addBombMoves(hand, lastPattern, playerId, moves);
            this.addRocketMoves(hand, lastMove, playerId, moves);
        }
        else if (isRocketType(lastType)) {
            // 王炸：更大的王炸或炸弹可以压
            this.addRocketMoves(hand, lastMove, playerId, moves);
            this.addBombMoves(hand, lastPattern, playerId, moves);
        }
        return moves;
    }
    /** 添加所有王炸 */
    static addRocketMoves(hand, lastMove, playerId, moves) {
        // 分离大小王
        const smallJokers = hand.cards.filter(c => c.rank === types_1.CardRank.SMALL_JOKER);
        const bigJokers = hand.cards.filter(c => c.rank === types_1.CardRank.BIG_JOKER);
        const smallCount = smallJokers.length;
        const bigCount = bigJokers.length;
        // 2王组合
        if (smallCount >= 2) {
            this.pushRocketMove([smallJokers[0], smallJokers[1]], CardPatternType2.ROCKET_two_SMALL, 1 * 10000, 2, lastMove, playerId, moves);
        }
        if (smallCount >= 1 && bigCount >= 1) {
            this.pushRocketMove([smallJokers[0], bigJokers[0]], CardPatternType2.ROCKET_two_MEDIUM, 1 * 10000, 2, lastMove, playerId, moves);
        }
        if (bigCount >= 2) {
            this.pushRocketMove([bigJokers[0], bigJokers[1]], CardPatternType2.ROCKET_two_LARGE, 1 * 10000, 2, lastMove, playerId, moves);
        }
        // 3王组合
        if (smallCount >= 3) {
            this.pushRocketMove([smallJokers[0], smallJokers[1], smallJokers[2]], CardPatternType2.ROCKET_three_SMALL, 2 * 10000, 3, lastMove, playerId, moves);
        }
        if (smallCount >= 2 && bigCount >= 1) {
            this.pushRocketMove([smallJokers[0], smallJokers[1], bigJokers[0]], CardPatternType2.ROCKET_three_MEDIUM1, 2 * 10000, 3, lastMove, playerId, moves);
        }
        if (smallCount >= 1 && bigCount >= 2) {
            this.pushRocketMove([smallJokers[0], bigJokers[0], bigJokers[1]], CardPatternType2.ROCKET_three_MEDIUM2, 2 * 10000, 3, lastMove, playerId, moves);
        }
        if (bigCount >= 3) {
            this.pushRocketMove([bigJokers[0], bigJokers[1], bigJokers[2]], CardPatternType2.ROCKET_three_LARGE, 2 * 10000, 3, lastMove, playerId, moves);
        }
        // 4王组合
        if (smallCount + bigCount >= 4) {
            const all4 = [...smallJokers, ...bigJokers].slice(0, 4);
            this.pushRocketMove(all4, CardPatternType2.ROCKET_four, 3 * 10000, 4, lastMove, playerId, moves);
        }
        // 5王组合
        if (smallCount + bigCount >= 5) {
            const all5 = [...smallJokers, ...bigJokers].slice(0, 5);
            this.pushRocketMove(all5, CardPatternType2.ROCKET_five, 4 * 10000, 5, lastMove, playerId, moves);
        }
        // 6王组合
        if (smallCount + bigCount >= 6) {
            const all6 = [...smallJokers, ...bigJokers].slice(0, 6);
            this.pushRocketMove(all6, CardPatternType2.ROCKET_six, 5 * 10000, 6, lastMove, playerId, moves);
        }
    }
    /** 辅助方法：添加王炸到moves */
    static pushRocketMove(cards, rocketType, primaryValue, secondaryValue, lastMove, playerId, moves) {
        const rocketMove = {
            cards,
            pattern: { type: rocketType, primaryValue, secondaryValue },
            playerId,
        };
        // 如果有上家，检查是否能打过
        if (lastMove && lastMove.cards.length > 0) {
            if (!this.canBeat(rocketMove, lastMove))
                return;
        }
        moves.push(rocketMove);
    }
    /** 添加所有能压过 lastPattern 的炸弹 */
    static addBombMoves(hand, lastPattern, playerId, moves) {
        const lastType = lastPattern.type;
        const lastPriority = getBombPriorityIndex(lastType);
        const lastPrimaryValue = lastPattern.primaryValue;
        const rankCounts = hand.getRankCounts();
        for (const [rank, count] of rankCounts) {
            // 王不能组成炸弹
            if (rank === types_1.CardRank.SMALL_JOKER || rank === types_1.CardRank.BIG_JOKER)
                continue;
            if (count < 4)
                continue;
            const rankCards = hand.getCardsByRank(rank);
            for (const bombType of BOMB_PRIORITY) {
                if (isRocketType(bombType))
                    continue;
                const neededCards = (() => {
                    switch (bombType) {
                        case CardPatternType2.BOMB_four: return 4;
                        case CardPatternType2.BOMB_five: return 5;
                        case CardPatternType2.BOMB_six: return 6;
                        case CardPatternType2.BOMB_seven: return 7;
                        case CardPatternType2.BOMB_eight: return 8;
                        case CardPatternType2.BOMB_nine: return 9;
                        case CardPatternType2.BOMB_ten: return 10;
                        case CardPatternType2.BOMB_eleven: return 11;
                        case CardPatternType2.BOMB_twelve: return 12;
                        default: return 0;
                    }
                })();
                if (count < neededCards)
                    continue;
                const bombPriority = getBombPriorityIndex(bombType);
                if (lastPriority >= 0 && bombPriority > lastPriority)
                    continue;
                const bombLevel = (() => {
                    switch (bombType) {
                        case CardPatternType2.BOMB_four: return 1;
                        case CardPatternType2.BOMB_five: return 2;
                        case CardPatternType2.BOMB_six: return 3;
                        case CardPatternType2.BOMB_seven: return 4;
                        case CardPatternType2.BOMB_eight: return 5;
                        case CardPatternType2.BOMB_nine: return 6;
                        case CardPatternType2.BOMB_ten: return 7;
                        case CardPatternType2.BOMB_eleven: return 8;
                        case CardPatternType2.BOMB_twelve: return 9;
                        default: return 0;
                    }
                })();
                const bombPrimaryValue = bombLevel * 100 + rank;
                if (bombPriority === lastPriority && bombPrimaryValue <= lastPrimaryValue)
                    continue;
                moves.push({
                    cards: rankCards.slice(0, neededCards),
                    pattern: { type: bombType, primaryValue: bombPrimaryValue, secondaryValue: neededCards },
                    playerId
                });
                // 如果有更多同点数的牌，也要生成（如同rank有6张，应生成5张和6张两种炸弹）
                if (count > neededCards) {
                    moves.push({
                        cards: rankCards.slice(0, count),
                        pattern: { type: bombType, primaryValue: bombPrimaryValue, secondaryValue: count },
                        playerId
                    });
                }
            }
        }
    }
    /** 生成所有合法出牌（开局时使用） */
    static generateAllValidMoves(hand, playerId) {
        const moves = [];
        const rankCounts = hand.getRankCounts();
        // 单张
        for (const card of hand.cards) {
            moves.push({ cards: [card], pattern: { type: types_1.CardPatternType.SINGLE, primaryValue: card.rank }, playerId });
        }
        // 对子
        for (const [rank, count] of rankCounts) {
            if (count >= 2) {
                const cards = hand.getCardsByRank(rank);
                moves.push({ cards: [cards[0], cards[1]], pattern: { type: types_1.CardPatternType.PAIR, primaryValue: rank }, playerId });
            }
        }
        // 三张
        for (const [rank, count] of rankCounts) {
            if (count >= 3) {
                const cards = hand.getCardsByRank(rank);
                moves.push({ cards: [cards[0], cards[1], cards[2]], pattern: { type: types_1.CardPatternType.TRIPLE, primaryValue: rank }, playerId });
            }
        }
        // 炸弹
        this.addAllBombs(hand, playerId, moves);
        // 三带一
        for (const [tripleRank, tripleCount] of rankCounts) {
            if (tripleCount >= 3) {
                const tripleCards = hand.getCardsByRank(tripleRank);
                const remaining = hand.cards.filter(c => c.rank !== tripleRank);
                for (const singleCard of remaining) {
                    moves.push({
                        cards: [tripleCards[0], tripleCards[1], tripleCards[2], singleCard],
                        pattern: { type: types_1.CardPatternType.TRIPLE_SINGLE, primaryValue: tripleRank },
                        playerId
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
                            pattern: { type: types_1.CardPatternType.TRIPLE_PAIR, primaryValue: tripleRank },
                            playerId
                        });
                    }
                }
            }
        }
        // 顺子
        this.generateStraightMoves(hand, { type: types_1.CardPatternType.STRAIGHT, primaryValue: 0 }, 0, playerId, moves, true);
        // 连对
        this.generateStraightMoves(hand, { type: types_1.CardPatternType.STRAIGHT_PAIRS, primaryValue: 0 }, 0, playerId, moves, true);
        // 飞机
        this.generateStraightMoves(hand, { type: types_1.CardPatternType.STRAIGHT_TRIPLES, primaryValue: 0 }, 0, playerId, moves, true);
        // 王炸（开局时所有王炸都可以出）
        this.addRocketMoves(hand, null, playerId, moves);
        return moves;
    }
    /** 添加所有炸弹 */
    static addAllBombs(hand, playerId, moves) {
        const rankCounts = hand.getRankCounts();
        for (const [rank, count] of rankCounts) {
            if (rank === types_1.CardRank.SMALL_JOKER || rank === types_1.CardRank.BIG_JOKER)
                continue;
            if (count < 4)
                continue;
            const rankCards = hand.getCardsByRank(rank);
            // 4炸
            moves.push({
                cards: rankCards.slice(0, 4),
                pattern: { type: CardPatternType2.BOMB_four, primaryValue: 1 * 100 + rank, secondaryValue: 4 },
                playerId
            });
            // 5炸
            if (count >= 5) {
                moves.push({
                    cards: rankCards.slice(0, 5),
                    pattern: { type: CardPatternType2.BOMB_five, primaryValue: 2 * 100 + rank, secondaryValue: 5 },
                    playerId
                });
            }
            // 6炸
            if (count >= 6) {
                moves.push({
                    cards: rankCards.slice(0, 6),
                    pattern: { type: CardPatternType2.BOMB_six, primaryValue: 3 * 100 + rank, secondaryValue: 6 },
                    playerId
                });
            }
            // 7炸
            if (count >= 7) {
                moves.push({
                    cards: rankCards.slice(0, 7),
                    pattern: { type: CardPatternType2.BOMB_seven, primaryValue: 4 * 100 + rank, secondaryValue: 7 },
                    playerId
                });
            }
            // 8炸
            if (count >= 8) {
                moves.push({
                    cards: rankCards.slice(0, 8),
                    pattern: { type: CardPatternType2.BOMB_eight, primaryValue: 5 * 100 + rank, secondaryValue: 8 },
                    playerId
                });
            }
            // 9炸
            if (count >= 9) {
                moves.push({
                    cards: rankCards.slice(0, 9),
                    pattern: { type: CardPatternType2.BOMB_nine, primaryValue: 6 * 100 + rank, secondaryValue: 9 },
                    playerId
                });
            }
            // 10炸
            if (count >= 10) {
                moves.push({
                    cards: rankCards.slice(0, 10),
                    pattern: { type: CardPatternType2.BOMB_ten, primaryValue: 7 * 100 + rank, secondaryValue: 10 },
                    playerId
                });
            }
            // 11炸
            if (count >= 11) {
                moves.push({
                    cards: rankCards.slice(0, 11),
                    pattern: { type: CardPatternType2.BOMB_eleven, primaryValue: 8 * 100 + rank, secondaryValue: 11 },
                    playerId
                });
            }
            // 12炸
            if (count >= 12) {
                moves.push({
                    cards: rankCards.slice(0, 12),
                    pattern: { type: CardPatternType2.BOMB_twelve, primaryValue: 9 * 100 + rank, secondaryValue: 12 },
                    playerId
                });
            }
        }
    }
    /** 生成顺子类出牌 */
    static generateStraightMoves(hand, lastPattern, lastCardCount, playerId, moves, allowAnyLength = false) {
        const distinctRanks = hand.getDistinctRanks().filter(r => r < types_1.CardRank.TWO);
        distinctRanks.sort((a, b) => a - b);
        if (distinctRanks.length < 2)
            return;
        const patternType = lastPattern.type;
        const cardsPerGroup = patternType === types_1.CardPatternType.STRAIGHT_PAIRS ? 2 :
            patternType === types_1.CardPatternType.STRAIGHT_TRIPLES ? 3 : 1;
        const minGroups = patternType === types_1.CardPatternType.STRAIGHT ? 5 :
            patternType === types_1.CardPatternType.STRAIGHT_PAIRS ? 3 : 2;
        for (let start = 0; start < distinctRanks.length; start++) {
            for (let end = start + minGroups - 1; end < distinctRanks.length; end++) {
                let isConsecutive = true;
                for (let i = start + 1; i <= end; i++) {
                    if (distinctRanks[i] !== distinctRanks[i - 1] + 1) {
                        isConsecutive = false;
                        break;
                    }
                }
                if (!isConsecutive)
                    continue;
                const straightLength = end - start + 1;
                const straightRanks = distinctRanks.slice(start, end + 1);
                let canForm = true;
                for (const rank of straightRanks) {
                    if (hand.countRank(rank) < cardsPerGroup) {
                        canForm = false;
                        break;
                    }
                }
                if (!canForm)
                    continue;
                if (!allowAnyLength && straightLength !== (lastPattern.secondaryValue || 0))
                    continue;
                const maxRank = straightRanks[straightRanks.length - 1];
                if (!allowAnyLength && maxRank <= lastPattern.primaryValue)
                    continue;
                const straightCards = [];
                for (const rank of straightRanks) {
                    const cards = hand.getCardsByRank(rank).slice(0, cardsPerGroup);
                    straightCards.push(...cards);
                }
                if (straightCards.length === lastCardCount || allowAnyLength) {
                    moves.push({
                        cards: straightCards,
                        pattern: { type: patternType, primaryValue: maxRank, secondaryValue: straightLength },
                        playerId
                    });
                }
            }
        }
    }
}
exports.GameRules2 = GameRules2;
//# sourceMappingURL=GameRules2.js.map