"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = require("../config");
const config = {
    host: config_1.DB_CONFIG.host,
    port: config_1.DB_CONFIG.port,
    user: config_1.DB_CONFIG.user,
    password: config_1.DB_CONFIG.password,
    database: config_1.DB_CONFIG.database,
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