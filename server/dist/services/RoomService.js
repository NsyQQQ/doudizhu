"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomService = exports.RoomService = void 0;
const database_1 = require("../db/database");
class RoomService {
    /** 生成6位房间号 */
    generateRoomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    /** 创建房间 */
    async createRoom(hostId, type = 1, gameType = 1) {
        const connection = await database_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const roomCode = this.generateRoomCode();
            const initialPlayer = {
                id: hostId,
                openid: '',
                nickname: '你',
                avatar: '',
                isReady: true,
                isHost: true,
                isAI: false,
                isEmpty: false
            };
            const [result] = await connection.query('INSERT INTO rooms (room_code, type, game_type, status, host_id, players) VALUES (?, ?, ?, ?, ?, ?)', [roomCode, type, gameType, 'waiting', hostId, JSON.stringify([initialPlayer])]);
            await connection.commit();
            if (result.affectedRows > 0) {
                return {
                    id: result.insertId,
                    room_code: roomCode,
                    type,
                    game_type: gameType,
                    status: 'waiting',
                    host_id: hostId,
                    players: [initialPlayer],
                    create_time: new Date(),
                    update_time: new Date()
                };
            }
            return null;
        }
        catch (error) {
            await connection.rollback();
            console.error('[RoomService] createRoom error:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /** 根据房间号查找房间 */
    async findByRoomCode(roomCode) {
        try {
            const [rows] = await database_1.pool.query('SELECT * FROM rooms WHERE room_code = ?', [roomCode]);
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return {
                ...row,
                players: JSON.parse(row.players)
            };
        }
        catch (error) {
            console.error('[RoomService] findByRoomCode error:', error);
            throw error;
        }
    }
    /** 根据ID查找房间 */
    async findById(id) {
        try {
            const [rows] = await database_1.pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
            if (rows.length === 0)
                return null;
            const row = rows[0];
            return {
                ...row,
                players: JSON.parse(row.players)
            };
        }
        catch (error) {
            console.error('[RoomService] findById error:', error);
            throw error;
        }
    }
    /** 更新房间玩家列表 */
    async updatePlayers(roomId, players) {
        try {
            const [result] = await database_1.pool.query('UPDATE rooms SET players = ? WHERE id = ?', [JSON.stringify(players), roomId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('[RoomService] updatePlayers error:', error);
            throw error;
        }
    }
    /** 更新房间状态 */
    async updateStatus(roomId, status) {
        try {
            const [result] = await database_1.pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, roomId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('[RoomService] updateStatus error:', error);
            throw error;
        }
    }
    /** 添加玩家到房间 */
    async addPlayer(roomCode, player) {
        const room = await this.findByRoomCode(roomCode);
        if (!room)
            return null;
        // 查找空位
        const emptyIndex = room.players.findIndex(p => p.isEmpty);
        if (emptyIndex === -1)
            return null; // 房间已满
        room.players[emptyIndex] = { ...player, isEmpty: false };
        await this.updatePlayers(room.id, room.players);
        return room;
    }
    /** 移除玩家从房间 */
    async removePlayer(roomCode, playerId) {
        const room = await this.findByRoomCode(roomCode);
        if (!room)
            return null;
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1)
            return null;
        // 标记为空位
        room.players[playerIndex] = {
            ...room.players[playerIndex],
            isEmpty: true,
            isReady: false,
            isAI: false
        };
        await this.updatePlayers(room.id, room.players);
        return room;
    }
    /** 删除房间 */
    async deleteRoom(roomId) {
        try {
            const [result] = await database_1.pool.query('DELETE FROM rooms WHERE id = ?', [roomId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('[RoomService] deleteRoom error:', error);
            throw error;
        }
    }
    /** 清空所有房间 */
    async deleteAllRooms() {
        try {
            await database_1.pool.query('DELETE FROM rooms');
            console.log('[RoomService] All rooms deleted');
        }
        catch (error) {
            console.error('[RoomService] deleteAllRooms error:', error);
            throw error;
        }
    }
    /** 获取所有房间 */
    async getAllRooms() {
        try {
            const [rows] = await database_1.pool.query('SELECT * FROM rooms');
            return rows.map(row => ({
                ...row,
                players: typeof row.players === 'string' ? JSON.parse(row.players) : row.players
            }));
        }
        catch (error) {
            console.error('[RoomService] getAllRooms error:', error);
            throw error;
        }
    }
    /** 保存游戏记录 */
    async saveGameRecord(record) {
        try {
            const [result] = await database_1.pool.query(`INSERT INTO game_records (room_id, room_code, landlord_id, winner_id, player_scores, base_score, multiple)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [record.room_id, record.room_code, record.landlord_id, record.winner_id,
                JSON.stringify(record.player_scores), record.base_score, record.multiple]);
            return result.insertId;
        }
        catch (error) {
            console.error('[RoomService] saveGameRecord error:', error);
            throw error;
        }
    }
}
exports.RoomService = RoomService;
exports.roomService = new RoomService();
//# sourceMappingURL=RoomService.js.map