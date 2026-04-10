"use strict";
/**
 * 游戏房间管理器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomManager = void 0;
const GameRoom_1 = require("./GameRoom");
const RoomService_1 = require("../services/RoomService");
class GameRoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map(); // playerId -> roomCode
        this.nextRoomId = 1;
    }
    /** 创建房间 */
    async createRoom(hostId, hostInfo, roomType = 1) {
        // 生成6位房间号
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const roomId = this.nextRoomId++;
        const room = new GameRoom_1.GameRoom(roomCode, roomId, roomType);
        room.addPlayer(hostInfo);
        this.rooms.set(roomCode, room);
        this.playerRooms.set(hostId, roomCode);
        // 持久化到数据库
        try {
            const dbRoom = await RoomService_1.roomService.createRoom(hostId, roomType);
            if (dbRoom) {
                console.log(`[GameRoomManager] Room ${roomCode} saved to database, id=${dbRoom.id}`);
            }
        }
        catch (error) {
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
    findByRoomCode(roomCode) {
        return this.rooms.get(roomCode);
    }
    /** 根据房间ID查找房间 */
    findByRoomId(roomId) {
        for (const room of this.rooms.values()) {
            if (room.roomId === roomId) {
                return room;
            }
        }
        return undefined;
    }
    /** 玩家加入房间 */
    joinRoom(roomCode, playerInfo) {
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
    leaveRoom(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode)
            return;
        const room = this.rooms.get(roomCode);
        if (!room)
            return;
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
    getPlayerRoom(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode)
            return undefined;
        return this.rooms.get(roomCode);
    }
    /** 销毁房间 */
    destroyRoom(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room)
            return;
        // 清除所有玩家的房间关联
        for (const [playerId, code] of this.playerRooms.entries()) {
            if (code === roomCode) {
                this.playerRooms.delete(playerId);
            }
        }
        // 从数据库删除
        RoomService_1.roomService.deleteRoom(room.roomId).catch(err => console.error('[GameRoomManager] Failed to delete room from DB:', err));
        room.destroy();
        this.rooms.delete(roomCode);
    }
    /** 同步房间数据到数据库 */
    async syncRoomToDatabase(room) {
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
        await RoomService_1.roomService.updatePlayers(room.roomId, players);
        await RoomService_1.roomService.updateStatus(room.roomId, room.getStatus());
    }
    /** 清理孤儿房间（游戏中或已结束但没有玩家的房间） */
    async cleanupOrphanedRooms() {
        try {
            // 从数据库获取所有房间
            const dbRooms = await RoomService_1.roomService.getAllRooms();
            for (const dbRoom of dbRooms) {
                const room = this.findByRoomId(dbRoom.id);
                // 如果内存中没有这个房间，说明是孤儿，删除
                if (!room) {
                    console.log(`[GameRoomManager] Cleaning up orphaned room from DB: ${dbRoom.id}`);
                    await RoomService_1.roomService.deleteRoom(dbRoom.id);
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
        }
        catch (error) {
            console.error('[GameRoomManager] Failed to cleanup orphaned rooms:', error);
        }
    }
    /** 启动定期清理任务 */
    startPeriodicCleanup(intervalMs = 60000) {
        setInterval(() => {
            this.cleanupOrphanedRooms();
        }, intervalMs);
    }
    /** 获取所有房间 */
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    /** 获取房间数量 */
    getRoomCount() {
        return this.rooms.size;
    }
}
exports.GameRoomManager = GameRoomManager;
//# sourceMappingURL=GameRoomManager.js.map