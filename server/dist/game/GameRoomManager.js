"use strict";
/**
 * 游戏房间管理器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomManager = void 0;
const GameRoom_1 = require("./GameRoom");
class GameRoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map(); // playerId -> roomCode
        this.nextRoomId = 1;
    }
    /** 创建房间 */
    createRoom(hostId, hostInfo) {
        // 生成6位房间号
        const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const roomId = this.nextRoomId++;
        const room = new GameRoom_1.GameRoom(roomCode, roomId);
        room.addPlayer(hostInfo);
        this.rooms.set(roomCode, room);
        this.playerRooms.set(hostId, roomCode);
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
        // 如果房间空了，销毁
        if (room.getPlayerCount() === 0) {
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
        room.destroy();
        this.rooms.delete(roomCode);
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