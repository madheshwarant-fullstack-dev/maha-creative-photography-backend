/**
 * Lightweight NoSQL Injection Protection Middleware
 * Recursively cleans request bodies, query strings, and URL params by stripping
 * keys that begin with '$' or contain '.' (MongoDB operator injection vectors).
 */

function sanitizeObject(target) {
    if (!target || typeof target !== "object") {
        return target;
    }

    if (Array.isArray(target)) {
        for (let i = 0; i < target.length; i++) {
            target[i] = sanitizeObject(target[i]);
        }
        return target;
    }

    for (const key of Object.keys(target)) {
        if (key.startsWith("$") || key.includes(".")) {
            console.warn(`[Security Alert] Stripped potentially malicious NoSQL query operator: "${key}"`);
            delete target[key];
        } else {
            target[key] = sanitizeObject(target[key]);
        }
    }

    return target;
}

const mongoSanitize = (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    next();
};

module.exports = mongoSanitize;
