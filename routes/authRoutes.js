const express = require("express");

const {
    registerUser,
    loginUser,
    getUsers,
    deleteUser,
    getProfile,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    adminForgotPassword,
    verifyAdminResetToken,
    adminResetPassword,
} = require("../controllers/authController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ================= PUBLIC AUTH ROUTES =================

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

// Client Forgot Password
router.post(
    "/forgot-password",
    forgotPassword
);

// Client Verify Reset Token
router.get(
    "/verify-reset-token/:token",
    verifyResetToken
);

// Client Reset Password
router.post(
    "/reset-password/:token",
    resetPassword
);

// Admin Forgot Password
router.post(
    "/admin/forgot-password",
    adminForgotPassword
);

// Admin Verify Reset Token
router.get(
    "/admin/verify-reset-token/:token",
    verifyAdminResetToken
);

// Admin Reset Password
router.post(
    "/admin/reset-password/:token",
    adminResetPassword
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