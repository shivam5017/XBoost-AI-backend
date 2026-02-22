"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../lib/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const hash_1 = require("../utils/hash");
const router = express_1.default.Router();
// Signup
router.post('/signup', async (req, res) => {
    const { email, password, username, name } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    try {
        const hashed = await (0, hash_1.hashPassword)(password);
        const user = await db_1.default.user.create({
            data: {
                email,
                password: hashed,
                username: username || email.split('@')[0],
                name: name || username || email.split('@')[0],
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    }
    catch (err) {
        console.error('Signup error:', err);
        res.status(400).json({ error: err.message || 'User already exists' });
    }
});
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || !user.password)
            return res.status(400).json({ error: 'Invalid credentials' });
        const valid = await (0, hash_1.comparePassword)(password, user.password);
        if (!valid)
            return res.status(400).json({ error: 'Invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
