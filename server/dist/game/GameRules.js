"use strict";
/**
 * 游戏规则 - 服务端版本
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRules = exports.Hand = void 0;
const types_1 = require("./types");
/** 服务端手牌管理 */
class Hand {
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
exports.Hand = Hand;
/** 游戏规则 */
class GameRules {
    /** 识别牌型 */
    static recognizePattern(cards) {
        if (cards.length === 0) {
            return { type: types_1.CardPatternType.INVALID, primaryValue: 0 };
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
        // 王炸
        if (cardCount === 2) {
            const hasSmallJoker = rankCounts.get(types_1.CardRank.SMALL_JOKER) === 1;
            const hasBigJoker = rankCounts.get(types_1.CardRank.BIG_JOKER) === 1;
            if (hasSmallJoker && hasBigJoker) {
                return { type: types_1.CardPatternType.ROCKET, primaryValue: types_1.CardRank.BIG_JOKER };
            }
        }
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
        // 炸弹
        if (cardCount === 4 && countValues[0] === 4) {
            return { type: types_1.CardPatternType.BOMB, primaryValue: maxRank };
        }
        // 三带一
        if (cardCount === 4 && countValues[0] === 3 && countValues[1] === 1) {
            return { type: types_1.CardPatternType.TRIPLE_SINGLE, primaryValue: maxRank };
        }
        // 三带一对
        if (cardCount === 5 && countValues[0] === 3 && countValues[1] === 2) {
            return { type: types_1.CardPatternType.TRIPLE_PAIR, primaryValue: maxRank };
        }
        // 四带两张单牌
        if (cardCount === 6 && countValues[0] === 4) {
            return { type: types_1.CardPatternType.QUADRUPLE_SINGLE, primaryValue: maxRank, secondaryValue: 2 };
        }
        // 四带两对
        if (cardCount === 8 && countValues[0] === 4 && countValues[1] === 2 && countValues[2] === 2) {
            return { type: types_1.CardPatternType.QUADRUPLE_PAIR, primaryValue: maxRank, secondaryValue: 2 };
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
        return { type: types_1.CardPatternType.INVALID, primaryValue: 0 };
    }
    /** 判断 moveA 能否压过 moveB */
    static canBeat(moveA, moveB) {
        if (moveA.cards.length === 0) {
            return true;
        }
        if (!moveB || moveB.cards.length === 0) {
            const result = moveA.pattern.type !== types_1.CardPatternType.INVALID;
            return result;
        }
        const patternA = moveA.pattern;
        const patternB = moveB.pattern;
        // 火箭最大
        if (patternA.type === types_1.CardPatternType.ROCKET)
            return true;
        if (patternB.type === types_1.CardPatternType.ROCKET)
            return false;
        // 炸弹
        if (patternA.type === types_1.CardPatternType.BOMB) {
            if (patternB.type === types_1.CardPatternType.BOMB) {
                return patternA.primaryValue > patternB.primaryValue;
            }
            return true;
        }
        if (patternB.type === types_1.CardPatternType.BOMB)
            return false;
        // 其他牌型必须类型相同
        if (patternA.type !== patternB.type) {
            return false;
        }
        if (moveA.cards.length !== moveB.cards.length) {
            return false;
        }
        const result = patternA.primaryValue > patternB.primaryValue;
        return result;
    }
    /** 从手牌生成所有能压过 lastMove 的合法出牌 */
    static generateValidMoves(hand, lastMove, playerId) {
        const moves = [];
        if (!lastMove || lastMove.cards.length === 0) {
            return this.generateAllValidMoves(hand, playerId);
        }
        const lastPattern = lastMove.pattern;
        const rankCounts = hand.getRankCounts();
        switch (lastPattern.type) {
            case types_1.CardPatternType.SINGLE:
                for (const [rank] of rankCounts) {
                    if (rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0]], pattern: { type: types_1.CardPatternType.SINGLE, primaryValue: rank }, playerId });
                    }
                }
                if (hand.hasRocket()) {
                    const rocket = hand.cards.filter(c => c.rank === types_1.CardRank.SMALL_JOKER || c.rank === types_1.CardRank.BIG_JOKER);
                    moves.push({ cards: rocket, pattern: { type: types_1.CardPatternType.ROCKET, primaryValue: types_1.CardRank.BIG_JOKER }, playerId });
                }
                break;
            case types_1.CardPatternType.PAIR:
                for (const [rank, count] of rankCounts) {
                    if (count >= 2 && rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0], cards[1]], pattern: { type: types_1.CardPatternType.PAIR, primaryValue: rank }, playerId });
                    }
                }
                break;
            case types_1.CardPatternType.TRIPLE:
                for (const [rank, count] of rankCounts) {
                    if (count >= 3 && rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0], cards[1], cards[2]], pattern: { type: types_1.CardPatternType.TRIPLE, primaryValue: rank }, playerId });
                    }
                }
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
                break;
            case types_1.CardPatternType.BOMB:
                for (const [rank, count] of rankCounts) {
                    if (count >= 4 && rank > lastPattern.primaryValue) {
                        const cards = hand.getCardsByRank(rank);
                        moves.push({ cards: [cards[0], cards[1], cards[2], cards[3]], pattern: { type: types_1.CardPatternType.BOMB, primaryValue: rank }, playerId });
                    }
                }
                break;
            case types_1.CardPatternType.STRAIGHT:
            case types_1.CardPatternType.STRAIGHT_PAIRS:
            case types_1.CardPatternType.STRAIGHT_TRIPLES:
                this.generateStraightMoves(hand, lastPattern, lastMove.cards.length, playerId, moves);
                break;
        }
        // 火箭可以打任何非火箭
        if (hand.hasRocket() && lastPattern.type !== types_1.CardPatternType.ROCKET) {
            const rocket = hand.cards.filter(c => c.rank === types_1.CardRank.SMALL_JOKER || c.rank === types_1.CardRank.BIG_JOKER);
            moves.push({ cards: rocket, pattern: { type: types_1.CardPatternType.ROCKET, primaryValue: types_1.CardRank.BIG_JOKER }, playerId });
        }
        // 炸弹可以打任何非炸弹
        if (lastPattern.type !== types_1.CardPatternType.BOMB && lastPattern.type !== types_1.CardPatternType.ROCKET) {
            for (const [rank, count] of rankCounts) {
                if (count >= 4) {
                    const cards = hand.getCardsByRank(rank);
                    moves.push({ cards: [cards[0], cards[1], cards[2], cards[3]], pattern: { type: types_1.CardPatternType.BOMB, primaryValue: rank }, playerId });
                }
            }
        }
        return moves;
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
        for (const [rank, count] of rankCounts) {
            if (count >= 4) {
                const cards = hand.getCardsByRank(rank);
                moves.push({ cards: [cards[0], cards[1], cards[2], cards[3]], pattern: { type: types_1.CardPatternType.BOMB, primaryValue: rank }, playerId });
            }
        }
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
        // 火箭
        if (hand.hasRocket()) {
            const rocket = hand.cards.filter(c => c.rank === types_1.CardRank.SMALL_JOKER || c.rank === types_1.CardRank.BIG_JOKER);
            moves.push({ cards: rocket, pattern: { type: types_1.CardPatternType.ROCKET, primaryValue: types_1.CardRank.BIG_JOKER }, playerId });
        }
        // 四带两单
        for (const [quadRank, quadCount] of rankCounts) {
            if (quadCount >= 4) {
                const quadCards = hand.getCardsByRank(quadRank);
                const remaining = hand.cards.filter(c => c.rank !== quadRank);
                for (let i = 0; i < remaining.length; i++) {
                    for (let j = i + 1; j < remaining.length; j++) {
                        moves.push({
                            cards: [quadCards[0], quadCards[1], quadCards[2], quadCards[3], remaining[i], remaining[j]],
                            pattern: { type: types_1.CardPatternType.QUADRUPLE_SINGLE, primaryValue: quadRank },
                            playerId
                        });
                    }
                }
            }
        }
        return moves;
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
exports.GameRules = GameRules;
//# sourceMappingURL=GameRules.js.map