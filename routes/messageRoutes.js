const express = require("express");

const {
    getMessages,
    getMessageById,
    createMessage,
    updateMessageStatus,
    deleteMessage,
} = require("../controllers/messageController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ================= CLIENT =================

// Client sends a message / enquiry
router.post(
    "/",
    createMessage
);


// ================= ADMIN =================

// Get all messages
router.get(
    "/",
    protect,
    adminOnly,
    getMessages
);


// Get single message
router.get(
    "/:id",
    protect,
    adminOnly,
    getMessageById
);


// Update message status
router.put(
    "/:id/status",
    protect,
    adminOnly,
    updateMessageStatus
);


// Delete message
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteMessage
);


module.exports = router;