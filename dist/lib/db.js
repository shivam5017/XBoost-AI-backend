"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("../lib/generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
require("dotenv/config");
const globalForPrisma = global;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in environment variables");
}
const pool = new pg_1.default.Pool({
    connectionString: process.env.DATABASE_URL,
});
pool.on("error", (err) => {
    console.error("PostgreSQL pool error:", err);
});
// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    }
    else {
        console.log("✅ Database connected successfully");
        release();
    }
});
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        adapter,
        log: ["error", "warn"],
    });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.prisma;
