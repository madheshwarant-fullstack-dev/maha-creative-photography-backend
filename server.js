const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");
const mongoSanitize = require("./middleware/sanitize");
const authRoutes = require("./routes/authRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const packageRoutes = require("./routes/packageRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const messageRoutes = require("./routes/messageRoutes");

const { logEmailConfiguration, verifyTransporter } = require("./services/emailService");
const { isCloudinaryConfigured } = require("./config/cloudinary");

const app = express();

// Connect MongoDB (if not running in isolated test mode)
if (process.env.NODE_ENV !== "test") {
    connectDB();
}

// ================= SECURITY HEADERS =================
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false,
    })
);

// ================= PRODUCTION CORS CONFIGURATION =================
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
];

// Append CLIENT_URL and FRONTEND_URL from environment variables if provided
if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(",").map((url) => url.trim().replace(/\/+$/, ""));
    allowedOrigins.push(...urls);
}
if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(",").map((url) => url.trim().replace(/\/+$/, ""));
    allowedOrigins.push(...urls);
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Normalize origin without trailing slash
        const normalizedOrigin = origin.replace(/\/+$/, "");

        const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin);
        const isVercel = /https:\/\/maha-creative.*\.vercel\.app$/i.test(normalizedOrigin);

        // Verify against allowed origins or legitimate project Vercel deployments or local dev
        const isAllowed =
            isDev ||
            isLocalhost ||
            isVercel ||
            allowedOrigins.includes(normalizedOrigin);

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
            return callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// ================= RATE LIMITING =================
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes.",
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // 30 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes.",
    },
});

if (process.env.NODE_ENV !== "test") {
    app.use("/api", generalLimiter);
    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/register", authLimiter);
    app.use("/api/auth/forgot-password", authLimiter);
    app.use("/api/auth/admin/forgot-password", authLimiter);
}

// Body parsers with safe payload limits
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// NoSQL query sanitizer
app.use(mongoSanitize);

// Ensure uploads folder exists on startup
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images with cross-origin resource sharing
app.use(
    "/uploads",
    (req, res, next) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    },
    express.static(uploadsDir)
);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/messages", messageRoutes);

// Health Check Routes
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Maha Creative Photography Backend is running!",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Email / SMTP Health & Diagnostic Endpoint
app.get("/api/health/email", async (req, res) => {
    try {
        const smtpStatus = await verifyTransporter();
        res.status(smtpStatus.verified ? 200 : (smtpStatus.configured ? 502 : 503)).json({
            success: smtpStatus.verified,
            smtp: smtpStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Error verifying SMTP service",
            error: err.message,
        });
    }
});

// Centralized 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.originalUrl} not found`,
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// Server Listen (only when executed directly)
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        
        // Log Cloudinary configuration status
        if (isCloudinaryConfigured()) {
            console.log(`[Cloudinary] Connected and configured for persistent image storage (Cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);
        } else {
            console.warn(`[Cloudinary Warning] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET not set in .env. Uploads will fall back to local disk.`);
        }

        // Log safe email configuration
        logEmailConfiguration();

        // Check SMTP service status
        verifyTransporter()
            .then((smtpStatus) => {
                if (smtpStatus.verified) {
                    console.log(`[SMTP Service] Connected and verified (${smtpStatus.provider})`);
                } else if (smtpStatus.configured) {
                    console.warn(`[SMTP Service Warning] Credentials configured but verification failed: ${smtpStatus.error}`);
                    if (smtpStatus.diagnosis) {
                        console.warn(`[SMTP Service Recommendation] ${smtpStatus.diagnosis}`);
                    }
                } else {
                    console.log(`[SMTP Service Info] ${smtpStatus.message}`);
                    console.log(`[SMTP Service Info] Add EMAIL_USER and EMAIL_PASSWORD in .env for active email sending.`);
                }
            })
            .catch((err) => {
                console.error(`[SMTP Service Error]:`, err.message);
            });
    });
}

module.exports = app;