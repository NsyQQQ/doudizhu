/**
 * 牌堆管理 - 生成、洗牌、发牌
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardSuit, CardRank } from './Card';

/** 创建一副54张牌 */
export function createDeck(): Card[] {
    const deck: Card[] = [];
    let id = 0;

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
 * @param counts 每个人应得牌数，例如 [17, 17, 17]
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

    return [...hands, remaining]; // [玩家0手牌, 玩家1手牌, 玩家2手牌, 地主牌]
}
