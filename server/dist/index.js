"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const database_1 = require("./db/database");
const WebSocketHandler_1 = require("./websocket/WebSocketHandler");
const user_1 = require("./routes/user");
const room_1 = require("./routes/room");
const config_1 = require("./config");
const app = (0, express_1.default)();
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 请求日志
app.use((req, res, next) => {
    next();
});
// 路由
app.use('/api/user', user_1.userRoutes);
app.use('/api/room', room_1.roomRoutes);
// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// 错误处理
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 创建HTTP服务器
const server = http_1.default.createServer(app);
// 初始化WebSocket
WebSocketHandler_1.wsHandler.initialize(server);
// 启动服务器
async function start() {
    // 测试数据库连接
    const dbConnected = await (0, database_1.testConnection)();
    if (!dbConnected) {
        console.error('[Server] Database connection failed, please check your MySQL configuration');
    }
    server.listen(config_1.SERVER_CONFIG.port, () => {
        console.log(`[Server] Running on port ${config_1.SERVER_CONFIG.port} (${config_1.SERVER_CONFIG.isProduction ? 'Production' : 'Development'})`);
    });
}
start();
//# sourceMappingURL=index.js.map