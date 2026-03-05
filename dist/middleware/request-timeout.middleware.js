"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = requestTimeout;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
function requestTimeout(req, res, next) {
    req.setTimeout(REQUEST_TIMEOUT_MS);
    res.setTimeout(REQUEST_TIMEOUT_MS, () => {
        if (res.headersSent)
            return;
        res.status(504).json({
            error: "Request timed out. Please retry.",
            code: "REQUEST_TIMEOUT",
        });
    });
    next();
}
