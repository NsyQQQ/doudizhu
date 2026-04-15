/**
 * 游戏房间管理器
 */

import { GameRoom } from './GameRoom';
import { GamePlayer } from './types';
import { roomService } from '../services/RoomService';

export class GameRoomManager {
    private rooms: Map<string, GameRoom> = new Map();
    private playerRooms: Map<number, string> = new Map(); // playerId -> roomCode
    private nextRoomId: number = 1;

    /** 创建房间 */
    async createRoom(hostId: number, hostInfo: Omit<GamePlayer, 'hand' | 'isLandlord'>, roomType: number = 1, gameType: number = 1): Promise<GameRoom> {
        // 生成6位房间号
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const roomId = this.nextRoomId++;

        const room = new GameRoom(roomCode, roomId, roomType, gameType);
        room.addPlayer(hostInfo);

        this.rooms.set(roomCode, room);
        this.playerRooms.set(hostId, roomCode);

        // 持久化到数据库
        try {
            const dbRoom = await roomService.createRoom(hostId, roomType, gameType);
            if (dbRoom) {
                console.log(`[GameRoomManager] Room ${roomCode} saved to database, id=${dbRoom.id}`);
            }
        } catch (error) {
            console.error('[GameRoomManager] Failed to save room to database:', error);
        }

        // 监听房间事件
        room.on('game_over', () => {
            // 游戏结束后不立即销毁，等待一段时间让客户端处理
            setTimeout(() => {
                this.destroyRoom(roomCode);
            }, 30000);
        });

        return room;
    }

    /** 根据房间号查找房间 */
    findByRoomCode(roomCode: string): GameRoom | undefined {
        return this.rooms.get(roomCode);
    }

    /** 根据房间ID查找房间 */
    findByRoomId(roomId: number): GameRoom | undefined {
        for (const room of this.rooms.values()) {
            if (room.roomId === roomId) {
                return room;
            }
        }
        return undefined;
    }

    /** 玩家加入房间 */
    joinRoom(roomCode: string, playerInfo: Omit<GamePlayer, 'hand' | 'isLandlord'>): { room: GameRoom, position: number } | null {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return null;
        }

        if (room.getStatus() !== 'waiting') {
            return null;
        }

        const position = room.addPlayer(playerInfo);
        if (position === null) {
            return null;
        }

        this.playerRooms.set(playerInfo.id, roomCode);

        // 更新数据库
        this.syncRoomToDatabase(room).catch(err => console.error('[GameRoomManager] Failed to update room:', err));

        return { room, position };
    }

    /** 玩家离开房间 */
    leaveRoom(playerId: number): void {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room) return;

        room.removePlayer(playerId);
        this.playerRooms.delete(playerId);

        // 更新数据库
        this.syncRoomToDatabase(room).catch(err => console.error('[GameRoomManager] Failed to update room:', err));

        // 检查是否还有真实玩家（人类非AI）
        const hasHumanPlayer = room.getPlayers().some(p => p !== null && !p.isAI);
        if (!hasHumanPlayer) {
            // 没有真实玩家了，销毁房间
            console.log(`[leaveRoom] No human players left in room ${roomCode}, destroying`);
            this.destroyRoom(roomCode);
        }
    }

    /** 获取玩家所在房间 */
    getPlayerRoom(playerId: number): GameRoom | undefined {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) return undefined;
        return this.rooms.get(roomCode);
    }

    /** 销毁房间 */
    destroyRoom(roomCode: string): void {
        const room = this.rooms.get(roomCode);
        if (!room) return;

        // 清除所有玩家的房间关联
        for (const [playerId, code] of this.playerRooms.entries()) {
            if (code === roomCode) {
                this.playerRooms.delete(playerId);
            }
        }

        // 从数据库删除
        roomService.deleteRoom(room.roomId).catch(err => console.error('[GameRoomManager] Failed to delete room from DB:', err));

        room.destroy();
        this.rooms.delete(roomCode);
    }

    /** 同步房间数据到数据库 */
    private async syncRoomToDatabase(room: GameRoom): Promise<void> {
        const players = room.getPlayers().map(p => p === null ? {
            id: 0,
            openid: '',
            nickname: '',
            avatar: '',
            isReady: false,
            isHost: false,
            isAI: false,
            isEmpty: true
        } : {
            id: p.id,
            openid: p.openid,
            nickname: p.nickname || '未知',
            avatar: p.avatar || '',
            isReady: p.isReady,
            isHost: p.isHost,
            isAI: p.isAI,
            isEmpty: false
        });

        await roomService.updatePlayers(room.roomId, players);
        await roomService.updateStatus(room.roomId, room.getStatus() as any);
    }

    /** 清理孤儿房间（游戏中或已结束但没有玩家的房间） */
    async cleanupOrphanedRooms(): Promise<void> {
        try {
            // 从数据库获取所有房间
            const dbRooms = await roomService.getAllRooms();
            for (const dbRoom of dbRooms) {
                const room = this.findByRoomId(dbRoom.id);
                // 如果内存中没有这个房间，说明是孤儿，删除
                if (!room) {
                    console.log(`[GameRoomManager] Cleaning up orphaned room from DB: ${dbRoom.id}`);
                    await roomService.deleteRoom(dbRoom.id);
                    continue;
                }
                // 如果房间已结束且没有玩家，销毁
                if (room.getStatus() === 'ended' && room.getPlayerCount() === 0) {
                    console.log(`[GameRoomManager] Destroying ended room with no players: ${room.roomCode}`);
                    this.destroyRoom(room.roomCode);
                }
                // 如果房间还在等待但没有玩家，也销毁（孤儿房间）
                if (room.getStatus() === 'waiting' && room.getPlayerCount() === 0) {
                    console.log(`[GameRoomManager] Destroying waiting room with no players: ${room.roomCode}`);
                    this.destroyRoom(room.roomCode);
                }
            }
        } catch (error) {
            console.error('[GameRoomManager] Failed to cleanup orphaned rooms:', error);
        }
    }

    /** 启动定期清理任务 */
    startPeriodicCleanup(intervalMs: number = 60000): void {
        setInterval(() => {
            this.cleanupOrphanedRooms();
        }, intervalMs);
    }

    /** 获取所有房间 */
    getAllRooms(): GameRoom[] {
        return Array.from(this.rooms.values());
    }

    /** 获取房间数量 */
    getRoomCount(): number {
        return this.rooms.size;
    }
}
