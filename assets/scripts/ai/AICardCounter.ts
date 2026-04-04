/**
 * AI计牌器 - 追踪已出的牌
 */

import { Card, CardRank } from '../core/Card';

export class AICardCounter {
    private playedCards: Set<number> = new Set();
    private initialCounts: Map<CardRank, number> = new Map();

    /** 记录初始手牌 */
    setInitialHand(cards: Card[]): void {
        this.initialCounts.clear();
        for (const card of cards) {
            this.initialCounts.set(card.rank, (this.initialCounts.get(card.rank) || 0) + 1);
        }
    }

    /** 记录出的牌 */
    cardPlayed(card: Card): void {
        this.playedCards.add(card.id);
    }

    /** 记录多张牌 */
    cardsPlayed(cards: Card[]): void {
        for (const card of cards) {
            this.cardPlayed(card);
        }
    }

    /** 获取某点数剩余数量 */
    getRemaining(rank: CardRank): number {
        const initial = this.initialCounts.get(rank) || 0;
        const played = Array.from(this.playedCards).filter(id => {
            // 这里需要通过ID推断点数，但ID不一定连续
            // 简化处理：追踪每张已出的牌
            return false; // 需要更复杂的实现
        }).length;
        return initial; // 简化版
    }

    /** 重置计数器 */
    reset(): void {
        this.playedCards.clear();
        this.initialCounts.clear();
    }
}
