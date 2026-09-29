const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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


// ================= EXPORT =================

module.exports = {
    registerUser,
    loginUser,
    createAdmin,
    getUsers,
    deleteUser,
    getProfile,
};