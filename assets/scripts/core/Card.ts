/**
 * 斗地主核心牌型定义
 * 纯 TypeScript，无 Cocos 依赖
 */

/** 花色（斗地主中花色基本无用，但用于区分54张牌） */
export enum CardSuit {
    SPADE = 0,   // 黑桃
    HEART = 1,   // 红桃
    CLUB = 2,    // 梅花
    DIAMOND = 3, // 方块
    JOKER = 4,   // 王（大小王共用）
}

/** 点数大小（3最小，小王/大王最大） */
export enum CardRank {
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    JACK = 11,
    QUEEN = 12,
    KING = 13,
    ACE = 14,
    TWO = 15,
    SMALL_JOKER = 16,  // 小王
    BIG_JOKER = 17,    // 大王
}

/** 牌型类型 */
export enum CardPatternType {
    PASS = -1,              // 不出
    INVALID = 0,            // 无效牌型
    SINGLE = 1,              // 单张
    PAIR = 2,                // 一对
    TRIPLE = 3,              // 三张（三代一的核心）
    TRIPLE_SINGLE = 4,      // 三带一
    TRIPLE_PAIR = 5,        // 三带二
    STRAIGHT = 6,            // 顺子（5+张）
    STRAIGHT_PAIRS = 7,     // 连对（3+对）
    STRAIGHT_TRIPLES = 8,   // 飞机（2+三张）
    STRAIGHT_TRIPLES_WITH_WINGS_SINGLE = 9,  // 飞机带单翅膀
    STRAIGHT_TRIPLES_WITH_WINGS_PAIR = 10,  // 飞机带对翅膀
    BOMB = 11,              // 炸弹（四同张）
    ROCKET = 12,            // 王炸（大小王）
    QUADRUPLE_SINGLE = 13,  // 四带两单
    QUADRUPLE_PAIR = 14,    // 四带两对
}

/** 单张牌 */
export interface Card {
    id: number;      // 唯一ID 0-53
    suit: CardSuit;
    rank: CardRank;
}

/** 牌型识别结果 */
export interface PatternResult {
    type: CardPatternType;
    primaryValue: number;   // 用于比较的主值（点数或数量）
    secondaryValue?: number; // 附加信息（如顺子长度、附加牌数量）
}

/** 获取牌面的显示字符 */
export function getCardDisplayChar(rank: CardRank): string {
    switch (rank) {
        case CardRank.THREE: return '3';
        case CardRank.FOUR: return '4';
        case CardRank.FIVE: return '5';
        case CardRank.SIX: return '6';
        case CardRank.SEVEN: return '7';
        case CardRank.EIGHT: return '8';
        case CardRank.NINE: return '9';
        case CardRank.TEN: return '10';
        case CardRank.JACK: return 'J';
        case CardRank.QUEEN: return 'Q';
        case CardRank.KING: return 'K';
        case CardRank.ACE: return 'A';
        case CardRank.TWO: return '2';
        case CardRank.SMALL_JOKER: return '小王';
        case CardRank.BIG_JOKER: return '大王';
        default: return '?';
    }
}

/** 获取牌面的显示名称 */
export function getCardDisplayName(card: Card): string {
    if (card.rank === CardRank.SMALL_JOKER) return '小王';
    if (card.rank === CardRank.BIG_JOKER) return '大王';

    const suitNames: string[] = ['黑桃', '红桃', '梅花', '方块'];
    const rankNames: string[] = ['', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

    return suitNames[card.suit] + rankNames[card.rank];
}

/** 根据卡牌ID解码为卡牌对象（6人场3副牌支持）
 * @param cardId 卡牌ID（格式: deck*1000 + indexWithinDeck）
 * @returns 卡牌对象
 */
export function decodeCardId(cardId: number): Card {
    const indexWithinDeck = cardId % 1000;
    let suit: CardSuit;
    let rank: CardRank;

    if (indexWithinDeck >= 52) {
        // 王牌：52=小王，53=大王
        suit = CardSuit.JOKER;
        rank = indexWithinDeck === 52 ? CardRank.SMALL_JOKER : CardRank.BIG_JOKER;
    } else {
        suit = (Math.floor(indexWithinDeck / 13)) as CardSuit;
        rank = ((indexWithinDeck % 13) + CardRank.THREE) as CardRank;
    }

    return { id: cardId, suit, rank };
}

/** 解码卡牌ID数组为卡牌对象数组 */
export function decodeCardIds(cardIds: number[]): Card[] {
    return cardIds.map(id => decodeCardId(id));
}
