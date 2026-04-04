/**
 * 手牌管理
 * 纯 TypeScript，无 Cocos 依赖
 */

import { Card, CardRank } from './Card';

/** 手牌类 */
export class Hand {
    private _cards: Card[] = [];

    constructor(cards: Card[] = []) {
        this._cards = [...cards];
    }

    /** 获取所有牌 */
    get cards(): Card[] {
        return [...this._cards];
    }

    /** 牌数量 */
    get count(): number {
        return this._cards.length;
    }

    /** 是否为空 */
    get isEmpty(): boolean {
        return this._cards.length === 0;
    }

    /** 按点数降序排列（用于显示，高牌在右边） */
    sortByRankDescending(): void {
        this._cards.sort((a, b) => b.rank - a.rank);
    }

    /** 按点数升序排列 */
    sortByRankAscending(): void {
        this._cards.sort((a, b) => a.rank - b.rank);
    }

    /** 按花色排序 */
    sortBySuit(): void {
        this._cards.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.suit - b.suit;
        });
    }

    /** 添加牌 */
    addCards(cards: Card[]): void {
        this._cards.push(...cards);
    }

    /** 移除指定牌（用于出牌） */
    removeCards(cards: Card[]): void {
        const toRemove = new Set(cards.map(c => c.id));
        this._cards = this._cards.filter(c => !toRemove.has(c.id));
        this.sortByRankDescending(); // 保持从大到小排序
    }

    /** 获取指定点数的所有牌 */
    getCardsByRank(rank: CardRank): Card[] {
        return this._cards.filter(c => c.rank === rank);
    }

    /** 获取点数统计 Map<rank, count> */
    getRankCounts(): Map<CardRank, number> {
        const counts = new Map<CardRank, number>();
        for (const card of this._cards) {
            counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
        }
        return counts;
    }

    /** 获取点数统计，返回排序后的数组 [{rank, count}] */
    getRankCountList(): { rank: CardRank; count: number }[] {
        const counts = this.getRankCounts();
        return Array.from(counts.entries())
            .map(([rank, count]) => ({ rank, count }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count; // 数量多的在前
                return b.rank - a.rank; // 数量相同则点数大的在前
            });
    }

    /** 检查是否有指定点数的牌 */
    hasRank(rank: CardRank): boolean {
        return this._cards.some(c => c.rank === rank);
    }

    /** 获取指定点数的牌数量 */
    countRank(rank: CardRank): number {
        return this._cards.filter(c => c.rank === rank).length;
    }

    /** 获取所有不同点数 */
    getDistinctRanks(): CardRank[] {
        return [...new Set(this._cards.map(c => c.rank))];
    }

    /** 检查是否有小王和大王（王炸） */
    hasRocket(): boolean {
        return this.hasRank(CardRank.SMALL_JOKER) && this.hasRank(CardRank.BIG_JOKER);
    }

    /** 获取大牌（2和王） */
    getHighCards(): Card[] {
        return this._cards.filter(c =>
            c.rank === CardRank.TWO ||
            c.rank === CardRank.SMALL_JOKER ||
            c.rank === CardRank.BIG_JOKER
        );
    }

    /** 深度复制 */
    clone(): Hand {
        return new Hand(this._cards.map(c => ({ ...c })));
    }
}
