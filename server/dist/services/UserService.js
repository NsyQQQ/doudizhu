"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("../db/database");
class UserService {
    /** 根据openid查找或创建用户 */
    async findOrCreateByOpenid(openid, nickname = '', avatar = '') {
        try {
            // 查找现有用户
            const [rows] = await database_1.pool.query('SELECT * FROM users WHERE openid = ?', [openid]);
            if (rows.length > 0) {
                return rows[0];
            }
            // 创建新用户
            const [result] = await database_1.pool.query('INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)', [openid, nickname, avatar]);
            if (result.affectedRows > 0) {
                const [newRows] = await database_1.pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
                return newRows[0];
            }
            return null;
        }
        catch (error) {
            console.error('[UserService] findOrCreateByOpenid error:', error);
            throw error;
        }
    }
    /** 根据openid查找用户（不创建） */
    async findByOpenid(openid) {
        try {
            const [rows] = await database_1.pool.query('SELECT * FROM users WHERE openid = ?', [openid]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('[UserService] findByOpenid error:', error);
            throw error;
        }
    }
    /** 根据ID查找用户 */
    async findById(id) {
        try {
            const [rows] = await database_1.pool.query('SELECT * FROM users WHERE id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('[UserService] findById error:', error);
            throw error;
        }
    }
    /** 更新用户房间ID */
    async updateRoomId(userId, roomId) {
        try {
            const [result] = await database_1.pool.query('UPDATE users SET room_id = ? WHERE id = ?', [roomId, userId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('[UserService] updateRoomId error:', error);
            throw error;
        }
    }
    /** 更新用户战绩 */
    async updateGameStats(userId, isWin) {
        try {
            const [result] = await database_1.pool.query('UPDATE users SET total_games = total_games + 1, win_games = win_games + ? WHERE id = ?', [isWin ? 1 : 0, userId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('[UserService] updateGameStats error:', error);
            throw error;
        }
    }
    /** 获取用户信息 */
    async getUserInfo(userId) {
        try {
            const user = await this.findById(userId);
            if (!user)
                return null;
            const winRate = user.total_games > 0 ? (user.win_games / user.total_games * 100).toFixed(1) : '0.0';
            return {
                total_games: user.total_games,
                win_games: user.win_games,
                win_rate: Number(winRate)
            };
        }
        catch (error) {
            console.error('[UserService] getUserInfo error:', error);
            throw error;
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
//# sourceMappingURL=UserService.js.map