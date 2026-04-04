"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const promise_1 = __importDefault(require("mysql2/promise"));
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'doudizhu',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};
exports.pool = promise_1.default.createPool(config);
/** 测试数据库连接 */
async function testConnection() {
    try {
        const connection = await exports.pool.getConnection();
        connection.release();
        return true;
    }
    catch (error) {
        console.error('[Database] MySQL connection failed:', error);
        return false;
    }
}
//# sourceMappingURL=database.js.map