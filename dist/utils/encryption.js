"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = "aes-256-cbc";
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, "hex");
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(ALGO, SECRET, iv);
    const encrypted = Buffer.concat([
        cipher.update(text),
        cipher.final(),
    ]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}
function decrypt(data) {
    const [ivHex, encryptedHex] = data.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto_1.default.createDecipheriv(ALGO, SECRET, iv);
    return Buffer.concat([
        decipher.update(encryptedText),
        decipher.final(),
    ]).toString();
}
