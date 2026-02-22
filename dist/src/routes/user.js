"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// GET /api/user/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const user = await db_1.default.user.findUnique({ where: { id: req.userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({
            user: {
                id: user.id,
                email: user.email ?? null,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
    }
    catch (err) {
        console.error('Fetch user error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
