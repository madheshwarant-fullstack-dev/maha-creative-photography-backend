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
const validateObjectId = require("../middleware/validateId");

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
    validateObjectId("id"),
    getMessageById
);


// Update message status
router.put(
    "/:id/status",
    protect,
    adminOnly,
    validateObjectId("id"),
    updateMessageStatus
);


// Delete message
router.delete(
    "/:id",
    protect,
    adminOnly,
    validateObjectId("id"),
    deleteMessage
);


module.exports = router;