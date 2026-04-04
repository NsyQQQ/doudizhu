/**
 * 游戏房间管理器
 */
import { GameRoom } from './GameRoom';
import { GamePlayer } from './types';
export declare class GameRoomManager {
    private rooms;
    private playerRooms;
    private nextRoomId;
    /** 创建房间 */
    createRoom(hostId: number, hostInfo: Omit<GamePlayer, 'hand' | 'isLandlord'>): GameRoom;
    /** 根据房间号查找房间 */
    findByRoomCode(roomCode: string): GameRoom | undefined;
    /** 根据房间ID查找房间 */
    findByRoomId(roomId: number): GameRoom | undefined;
    /** 玩家加入房间 */
    joinRoom(roomCode: string, playerInfo: Omit<GamePlayer, 'hand' | 'isLandlord'>): {
        room: GameRoom;
        position: number;
    } | null;
    /** 玩家离开房间 */
    leaveRoom(playerId: number): void;
    /** 获取玩家所在房间 */
    getPlayerRoom(playerId: number): GameRoom | undefined;
    /** 销毁房间 */
    destroyRoom(roomCode: string): void;
    /** 获取所有房间 */
    getAllRooms(): GameRoom[];
    /** 获取房间数量 */
    getRoomCount(): number;
}
//# sourceMappingURL=GameRoomManager.d.ts.map