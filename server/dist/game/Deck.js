"use strict";
/**
 * 牌堆管理 - 服务端版本
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeck = createDeck;
exports.shuffle = shuffle;
exports.deal = deal;
const types_1 = require("./types");
/** 创建一副54张牌 */
function createDeck() {
    const deck = [];
    let id = 0;
    for (let suit = types_1.CardSuit.SPADE; suit <= types_1.CardSuit.DIAMOND; suit++) {
        for (let rank = types_1.CardRank.THREE; rank <= types_1.CardRank.TWO; rank++) {
            deck.push({ id: id++, suit, rank });
        }
    }
    deck.push({ id: id++, suit: types_1.CardSuit.JOKER, rank: types_1.CardRank.SMALL_JOKER });
    deck.push({ id: id++, suit: types_1.CardSuit.JOKER, rank: types_1.CardRank.BIG_JOKER });
    return deck;
}
/** Fisher-Yates 洗牌 */
function shuffle(deck) {
    const result = [...deck];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
/** 发牌 */
function deal(deck, counts) {
    const hands = counts.map(() => []);
    let cardIndex = 0;
    for (let i = 0; i < counts[0]; i++) {
        for (let j = 0; j < counts.length; j++) {
            if (cardIndex < deck.length) {
                hands[j].push(deck[cardIndex++]);
            }
        }
    }
    const remaining = deck.slice(cardIndex);
    return [...hands, remaining];
}
//# sourceMappingURL=Deck.js.map