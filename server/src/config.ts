/**
 * 服务器配置
 * 根据环境自动选择配置
 */

// ==================== 环境配置 ====================
// true = 云服务器环境, false = 本地开发环境
const IS_PRODUCTION = true;

// ==================== 数据库配置 ====================
export const DB_CONFIG = {
    host: process.env.DB_HOST || (IS_PRODUCTION ? '8.135.50.241' : 'localhost'),
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || (IS_PRODUCTION ? '123456' : '123456'),
    database: process.env.DB_NAME || (IS_PRODUCTION ? 'nsyqqq' : 'doudizhu'),
};

// ==================== 服务器配置 ====================
export const SERVER_CONFIG = {
    port: Number(process.env.PORT) || 3000,
    isProduction: IS_PRODUCTION,
};