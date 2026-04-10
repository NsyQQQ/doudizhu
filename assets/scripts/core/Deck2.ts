/**
 * 牌堆管理 - 6人斗地主（3副牌）
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardSuit, CardRank } from './Card';

/** 创建指定数量的牌组
 * @param deckCount 牌组数量，默认为1（单副牌54张），3副牌为162张
 */
export function createDeck(deckCount: number = 1): Card[] {
    const deck: Card[] = [];

    for (let deckIdx = 0; deckIdx < deckCount; deckIdx++) {
        let id = deckIdx * 1000; // 每副牌ID偏移1000，避免ID冲突

        // 52张普通牌：4种花色 x 13个点数
        for (let suit = CardSuit.SPADE; suit <= CardSuit.DIAMOND; suit++) {
            for (let rank = CardRank.THREE; rank <= CardRank.TWO; rank++) {
                deck.push({
                    id: id++,
                    suit: suit,
                    rank: rank,
                });
            }
        }

        // 小王和大王
        deck.push({ id: id++, suit: CardSuit.JOKER, rank: CardRank.SMALL_JOKER });
        deck.push({ id: id++, suit: CardSuit.JOKER, rank: CardRank.BIG_JOKER });
    }

    return deck;
}

/** Fisher-Yates 洗牌算法 */
export function shuffle(deck: Card[]): Card[] {
    const result = [...deck];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * 发牌给多个玩家
 * @param deck 已洗好的牌堆
 * @param counts 每个人应得牌数，例如 [25, 25, 25, 25, 25, 25]
 * @returns 二维数组，每人一个 Card[]
 */
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

    // 剩余的牌（地主牌）
    const remaining = deck.slice(cardIndex);

    return [...hands, remaining]; // [玩家0手牌, 玩家1手牌, ..., 地主牌]
}
