const express = require("express");

const {
    registerUser,
    loginUser,
    getUsers,
    deleteUser,
    getProfile,
} = require("../controllers/authController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ================= PUBLIC ROUTES =================

// Client Register
router.post(
    "/register",
    registerUser
);

// Client / Admin Login
router.post(
    "/login",
    loginUser
);


// ================= PROFILE =================

// Logged-in user profile
router.get(
    "/profile",
    protect,
    getProfile
);

// ================= ADMIN ROUTES =================

// Get all registered users
router.get(
    "/users",
    protect,
    adminOnly,
    getUsers
);

// Delete a client user
router.delete(
    "/users/:id",
    protect,
    adminOnly,
    deleteUser
);


module.exports = router;