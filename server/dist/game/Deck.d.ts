/**
 * 牌堆管理 - 服务端版本
 */
import { Card } from './types';
/** 创建一副54张牌 */
export declare function createDeck(): Card[];
/** Fisher-Yates 洗牌 */
export declare function shuffle(deck: Card[]): Card[];
/** 发牌 */
export declare function deal(deck: Card[], counts: number[]): Card[][];
//# sourceMappingURL=Deck.d.ts.map