const express = require("express");

const {
    getBookings,
    getBookingById,
    getMyBookings,
    createBooking,
    updateBookingStatus,
    deleteBooking,
} = require("../controllers/bookingController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateId");

const router = express.Router();

// ================= CLIENT =================

// Create booking - Login required
router.post(
    "/",
    protect,
    createBooking
);

// Get logged-in user's bookings
router.get(
    "/my-bookings",
    protect,
    getMyBookings
);

// ================= ADMIN =================

// Get all bookings
router.get(
    "/",
    protect,
    adminOnly,
    getBookings
);

// Get booking by ID
router.get(
    "/:id",
    protect,
    adminOnly,
    validateObjectId("id"),
    getBookingById
);

// Update booking status
router.put(
    "/:id/status",
    protect,
    adminOnly,
    validateObjectId("id"),
    updateBookingStatus
);

// Delete booking
router.delete(
    "/:id",
    protect,
    adminOnly,
    validateObjectId("id"),
    deleteBooking
);

module.exports = router;