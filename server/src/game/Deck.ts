/**
 * 牌堆管理 - 服务端版本
 */

import { Card, CardSuit, CardRank } from './types';

/** 创建指定数量的牌组
 * @param deckCount 牌组数量，默认为1（单副牌54张），3副牌为162张
 */
export function createDeck(deckCount: number = 1): Card[] {
    const deck: Card[] = [];

    for (let deckIdx = 0; deckIdx < deckCount; deckIdx++) {
        let id = deckIdx * 1000; // 每副牌ID偏移1000，避免ID冲突

        for (let suit = CardSuit.SPADE; suit <= CardSuit.DIAMOND; suit++) {
            for (let rank = CardRank.THREE; rank <= CardRank.TWO; rank++) {
                deck.push({ id: id++, suit, rank });
            }
        }

        deck.push({ id: id++, suit: CardSuit.JOKER, rank: CardRank.SMALL_JOKER });
        deck.push({ id: id++, suit: CardSuit.JOKER, rank: CardRank.BIG_JOKER });
    }

    return deck;
}

/** Fisher-Yates 洗牌 */
export function shuffle(deck: Card[]): Card[] {
    const result = [...deck];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** 发牌 */
export function deal(deck: Card[], counts: number[]): Card[][] {
    const hands: Card[][] = counts.map(() => []);
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
