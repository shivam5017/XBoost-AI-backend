"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../lib/generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const globalForPrisma = global;
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const db = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        adapter,
    });
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = db;
exports.default = db;
