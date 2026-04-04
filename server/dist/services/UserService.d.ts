import { User } from '../models';
export declare class UserService {
    /** 根据openid查找或创建用户 */
    findOrCreateByOpenid(openid: string, nickname?: string, avatar?: string): Promise<User | null>;
    /** 根据ID查找用户 */
    findById(id: number): Promise<User | null>;
    /** 更新用户房间ID */
    updateRoomId(userId: number, roomId: number): Promise<boolean>;
    /** 更新用户战绩 */
    updateGameStats(userId: number, isWin: boolean): Promise<boolean>;
    /** 获取用户信息 */
    getUserInfo(userId: number): Promise<{
        total_games: number;
        win_games: number;
        win_rate: number;
    } | null>;
}
export declare const userService: UserService;
//# sourceMappingURL=UserService.d.ts.map