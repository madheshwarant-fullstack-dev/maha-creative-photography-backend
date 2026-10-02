const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const packageRoutes = require("./routes/packageRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

// Connect MongoDB
connectDB();

// ================= PRODUCTION CORS CONFIGURATION =================
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
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

        // Check if origin matches allowed list or any Vercel deployment preview / production domain
        const isAllowed =
            allowedOrigins.includes(normalizedOrigin) ||
            normalizedOrigin.endsWith(".vercel.app") ||
            process.env.NODE_ENV !== "production";

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
            return callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists on startup
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images with cross-origin resource sharing
app.use("/uploads", express.static(uploadsDir));

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

// Server Listen
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});