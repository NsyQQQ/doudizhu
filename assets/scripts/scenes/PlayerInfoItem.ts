/**
 * 玩家信息数据结构
 */

export interface PlayerInfoItem {
    id: number;
    name: string;
    avatar: string;   // 头像资源名
    isReady: boolean;
    isHost: boolean;
    isAI: boolean;
    isEmpty?: boolean;
}
