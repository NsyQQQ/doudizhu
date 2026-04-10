/**
 * 牌堆管理 - 服务端版本
 */
import { Card } from './types';
/** 创建指定数量的牌组
 * @param deckCount 牌组数量，默认为1（单副牌54张），3副牌为162张
 */
export declare function createDeck(deckCount?: number): Card[];
/** Fisher-Yates 洗牌 */
export declare function shuffle(deck: Card[]): Card[];
/** 发牌 */
export declare function deal(deck: Card[], counts: number[]): Card[][];
//# sourceMappingURL=Deck.d.ts.map