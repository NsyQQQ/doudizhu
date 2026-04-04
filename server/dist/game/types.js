"use strict";
/**
 * 斗地主游戏类型定义 - 服务端版本
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardPatternType = exports.CardRank = exports.CardSuit = void 0;
/** 花色 */
var CardSuit;
(function (CardSuit) {
    CardSuit[CardSuit["SPADE"] = 0] = "SPADE";
    CardSuit[CardSuit["HEART"] = 1] = "HEART";
    CardSuit[CardSuit["CLUB"] = 2] = "CLUB";
    CardSuit[CardSuit["DIAMOND"] = 3] = "DIAMOND";
    CardSuit[CardSuit["JOKER"] = 4] = "JOKER";
})(CardSuit || (exports.CardSuit = CardSuit = {}));
/** 点数 */
var CardRank;
(function (CardRank) {
    CardRank[CardRank["THREE"] = 3] = "THREE";
    CardRank[CardRank["FOUR"] = 4] = "FOUR";
    CardRank[CardRank["FIVE"] = 5] = "FIVE";
    CardRank[CardRank["SIX"] = 6] = "SIX";
    CardRank[CardRank["SEVEN"] = 7] = "SEVEN";
    CardRank[CardRank["EIGHT"] = 8] = "EIGHT";
    CardRank[CardRank["NINE"] = 9] = "NINE";
    CardRank[CardRank["TEN"] = 10] = "TEN";
    CardRank[CardRank["JACK"] = 11] = "JACK";
    CardRank[CardRank["QUEEN"] = 12] = "QUEEN";
    CardRank[CardRank["KING"] = 13] = "KING";
    CardRank[CardRank["ACE"] = 14] = "ACE";
    CardRank[CardRank["TWO"] = 15] = "TWO";
    CardRank[CardRank["SMALL_JOKER"] = 16] = "SMALL_JOKER";
    CardRank[CardRank["BIG_JOKER"] = 17] = "BIG_JOKER";
})(CardRank || (exports.CardRank = CardRank = {}));
/** 牌型 */
var CardPatternType;
(function (CardPatternType) {
    CardPatternType[CardPatternType["PASS"] = -1] = "PASS";
    CardPatternType[CardPatternType["INVALID"] = 0] = "INVALID";
    CardPatternType[CardPatternType["SINGLE"] = 1] = "SINGLE";
    CardPatternType[CardPatternType["PAIR"] = 2] = "PAIR";
    CardPatternType[CardPatternType["TRIPLE"] = 3] = "TRIPLE";
    CardPatternType[CardPatternType["TRIPLE_SINGLE"] = 4] = "TRIPLE_SINGLE";
    CardPatternType[CardPatternType["TRIPLE_PAIR"] = 5] = "TRIPLE_PAIR";
    CardPatternType[CardPatternType["STRAIGHT"] = 6] = "STRAIGHT";
    CardPatternType[CardPatternType["STRAIGHT_PAIRS"] = 7] = "STRAIGHT_PAIRS";
    CardPatternType[CardPatternType["STRAIGHT_TRIPLES"] = 8] = "STRAIGHT_TRIPLES";
    CardPatternType[CardPatternType["STRAIGHT_TRIPLES_WITH_WINGS_SINGLE"] = 9] = "STRAIGHT_TRIPLES_WITH_WINGS_SINGLE";
    CardPatternType[CardPatternType["STRAIGHT_TRIPLES_WITH_WINGS_PAIR"] = 10] = "STRAIGHT_TRIPLES_WITH_WINGS_PAIR";
    CardPatternType[CardPatternType["BOMB"] = 11] = "BOMB";
    CardPatternType[CardPatternType["ROCKET"] = 12] = "ROCKET";
    CardPatternType[CardPatternType["QUADRUPLE_SINGLE"] = 13] = "QUADRUPLE_SINGLE";
    CardPatternType[CardPatternType["QUADRUPLE_PAIR"] = 14] = "QUADRUPLE_PAIR";
})(CardPatternType || (exports.CardPatternType = CardPatternType = {}));
//# sourceMappingURL=types.js.map