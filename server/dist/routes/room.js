"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomRoutes = void 0;
const express_1 = require("express");
const RoomService_1 = require("../services/RoomService");
const router = (0, express_1.Router)();
exports.roomRoutes = router;
/** 创建房间 */
router.post('/create', async (req, res) => {
    try {
        const { hostId, type } = req.body;
        if (!hostId) {
            res.status(400).json({ error: 'hostId is required' });
            return;
        }
        const room = await RoomService_1.roomService.createRoom(hostId, type || 1);
        if (!room) {
            res.status(500).json({ error: 'Create room failed' });
            return;
        }
        res.json({
            success: true,
            data: {
                id: room.id,
                roomCode: room.room_code,
                type: room.type,
                players: room.players
            }
        });
    }
    catch (error) {
        console.error('[RoomRoutes] /create error:', error);
        res.status(500).json({ error: 'Create room failed' });
    }
});
/** 根据房间号查找房间 */
router.get('/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await RoomService_1.roomService.findByRoomCode(roomCode);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        res.json({
            success: true,
            data: {
                id: room.id,
                roomCode: room.room_code,
                type: room.type,
                status: room.status,
                players: room.players
            }
        });
    }
    catch (error) {
        console.error('[RoomRoutes] /:roomCode error:', error);
        res.status(500).json({ error: 'Get room failed' });
    }
});
/** 删除房间 */
router.delete('/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await RoomService_1.roomService.findByRoomCode(roomCode);
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        await RoomService_1.roomService.deleteRoom(room.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('[RoomRoutes] /:roomCode DELETE error:', error);
        res.status(500).json({ error: 'Delete room failed' });
    }
});
//# sourceMappingURL=room.js.map