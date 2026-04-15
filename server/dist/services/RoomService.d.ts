import { Room, RoomPlayer, GameRecord } from '../models';
export declare class RoomService {
    /** 生成6位房间号 */
    private generateRoomCode;
    /** 创建房间 */
    createRoom(hostId: number, type?: number, gameType?: number): Promise<Room | null>;
    /** 根据房间号查找房间 */
    findByRoomCode(roomCode: string): Promise<Room | null>;
    /** 根据ID查找房间 */
    findById(id: number): Promise<Room | null>;
    /** 更新房间玩家列表 */
    updatePlayers(roomId: number, players: RoomPlayer[]): Promise<boolean>;
    /** 更新房间状态 */
    updateStatus(roomId: number, status: Room['status']): Promise<boolean>;
    /** 添加玩家到房间 */
    addPlayer(roomCode: string, player: RoomPlayer): Promise<Room | null>;
    /** 移除玩家从房间 */
    removePlayer(roomCode: string, playerId: number): Promise<Room | null>;
    /** 删除房间 */
    deleteRoom(roomId: number): Promise<boolean>;
    /** 清空所有房间 */
    deleteAllRooms(): Promise<void>;
    /** 获取所有房间 */
    getAllRooms(): Promise<Room[]>;
    /** 保存游戏记录 */
    saveGameRecord(record: Omit<GameRecord, 'id' | 'create_time'>): Promise<number | null>;
}
export declare const roomService: RoomService;
//# sourceMappingURL=RoomService.d.ts.map