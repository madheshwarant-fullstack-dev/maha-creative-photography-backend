const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");

// ================= REGISTER =================

const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
        } = req.body;

        if (
            !name ||
            !email ||
            !phone ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingUser =
            await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "user",
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error(
            "Register error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= LOGIN =================

const loginUser = async (req, res) => {
    try {
        const {
            email,
            password,
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required",
            });
        }

        const user =
            await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= CREATE ADMIN =================

// Temporary development function
// Remove or protect this route before production

const createAdmin = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
        } = req.body;

        if (
            !name ||
            !email ||
            !phone ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingUser =
            await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message:
                    "User with this email already exists",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const admin = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "admin",
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",

            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error(
            "Create admin error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= GET USERS =================

const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({
                createdAt: -1,
            });

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        console.error(
            "Get users error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= DELETE USER =================

const deleteUser = async (req, res) => {
    try {
        const {
            id,
        } = req.params;

        const user =
            await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Prevent deleting admin
        if (user.role === "admin") {
            return res.status(403).json({
                success: false,
                message:
                    "Admin account cannot be deleted",
            });
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete user error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= GET PROFILE =================

const getProfile = async (req, res) => {
    try {
        const user =
            await User.findById(
                req.user.id
            ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error(
            "Get profile error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= CLIENT FORGOT PASSWORD =================

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email address",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        // Security best practice: If account doesn't exist or is admin, return safe response
        // Client reset flow MUST NOT reset admin passwords
        if (!user || user.role === "admin") {
            return res.status(200).json({
                success: true,
                message:
                    "If an account with that email exists, a password reset link has been sent to your email.",
            });
        }

        // Generate cryptographically secure token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour expiry
        user.resetPasswordRole = "user";
        await user.save();

        const frontendBase = (
            process.env.FRONTEND_URL ||
            process.env.CLIENT_URL ||
            "http://localhost:5173"
        ).replace(/\/+$/, "");

        const resetUrl = `${frontendBase}/reset-password/${resetToken}`;

        await sendPasswordResetEmail({
            to: user.email,
            resetUrl,
            role: "user",
            userName: user.name,
        });

        res.status(200).json({
            success: true,
            message:
                "If an account with that email exists, a password reset link has been sent to your email.",
        });
    } catch (error) {
        console.error("Client forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to process request. Please try again later.",
        });
    }
};


// ================= CLIENT VERIFY RESET TOKEN =================

const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            resetPasswordRole: "user",
            role: { $ne: "admin" },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Password reset link is invalid or has expired.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Reset token is valid.",
        });
    } catch (error) {
        console.error("Verify client reset token error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= CLIENT RESET PASSWORD =================

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            resetPasswordRole: "user",
            role: { $ne: "admin" },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Password reset link is invalid or has expired.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.resetPasswordRole = null;
        await user.save();

        res.status(200).json({
            success: true,
            message:
                "Password reset successful! You can now login with your new password.",
        });
    } catch (error) {
        console.error("Client reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= ADMIN FORGOT PASSWORD =================

const adminForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter your admin email address",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        const admin = await User.findOne({
            email: normalizedEmail,
            role: "admin",
        });

        // Security best practice: Safe response even if admin not found
        if (!admin) {
            return res.status(200).json({
                success: true,
                message:
                    "If an admin account with that email exists, a password reset link has been sent to your email.",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        admin.resetPasswordToken = hashedToken;
        admin.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour expiry
        admin.resetPasswordRole = "admin";
        await admin.save();

        const frontendBase = (
            process.env.FRONTEND_URL ||
            process.env.CLIENT_URL ||
            "http://localhost:5173"
        ).replace(/\/+$/, "");

        const resetUrl = `${frontendBase}/admin/reset-password/${resetToken}`;

        await sendPasswordResetEmail({
            to: admin.email,
            resetUrl,
            role: "admin",
            userName: admin.name,
        });

        res.status(200).json({
            success: true,
            message:
                "If an admin account with that email exists, a password reset link has been sent to your email.",
        });
    } catch (error) {
        console.error("Admin forgot password error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to process request. Please try again later.",
        });
    }
};


// ================= ADMIN VERIFY RESET TOKEN =================

const verifyAdminResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required",
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const admin = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            resetPasswordRole: "admin",
            role: "admin",
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: "Admin password reset link is invalid or has expired.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Admin reset token is valid.",
        });
    } catch (error) {
        console.error("Verify admin reset token error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= ADMIN RESET PASSWORD =================

const adminResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const admin = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            resetPasswordRole: "admin",
            role: "admin",
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: "Admin password reset link is invalid or has expired.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        admin.password = hashedPassword;
        admin.resetPasswordToken = null;
        admin.resetPasswordExpires = null;
        admin.resetPasswordRole = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message:
                "Admin password reset successful! You can now login with your new password.",
        });
    } catch (error) {
        console.error("Admin reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= EXPORT =================

module.exports = {
    registerUser,
    loginUser,
    createAdmin,
    getUsers,
    deleteUser,
    getProfile,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    adminForgotPassword,
    verifyAdminResetToken,
    adminResetPassword,
};