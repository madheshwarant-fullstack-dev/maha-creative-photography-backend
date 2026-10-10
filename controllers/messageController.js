const Message = require("../models/Message");
const {
    sendContactNotification,
    sendContactAcknowledgement,
} = require("../services/emailService");

// ================= GET ALL MESSAGES =================

const getMessages = async (req, res) => {
    try {
        const messages = await Message.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error("Get messages error:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ================= GET MESSAGE BY ID =================

const getMessageById = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        res.status(200).json({
            success: true,
            message,
        });
    } catch (error) {
        console.error("Get message error:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ================= CREATE MESSAGE =================

const createMessage = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            subject,
            message,
        } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email and message are required",
            });
        }

        const trimmedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        const newMessage = await Message.create({
            name: name.trim(),
            email: trimmedEmail,
            phone: phone ? phone.trim() : "",
            subject: subject ? subject.trim() : "",
            message: message.trim(),
            status: "New",
        });

        // ================= SEND EMAIL NOTIFICATIONS =================
        let adminNotifResult = { success: false };
        let clientAckResult = { success: false };

        try {
            // 1. Notify studio admin
            adminNotifResult = await sendContactNotification({
                name: newMessage.name,
                email: newMessage.email,
                phone: newMessage.phone,
                subject: newMessage.subject,
                message: newMessage.message,
            });
            if (!adminNotifResult.success) {
                console.warn(
                    "[Contact Inquiries] Admin email notification could not be sent:",
                    adminNotifResult.error || "Unknown error"
                );
            }
        } catch (adminErr) {
            console.error("[Contact Inquiries] Exception notifying admin:", adminErr.message);
        }

        try {
            // 2. Acknowledge customer
            clientAckResult = await sendContactAcknowledgement({
                name: newMessage.name,
                email: newMessage.email,
                subject: newMessage.subject,
                message: newMessage.message,
            });
            if (!clientAckResult.success) {
                console.warn(
                    `[Contact Inquiries] Acknowledgement email to ${newMessage.email} could not be sent:`,
                    clientAckResult.error || "Unknown error"
                );
            }
        } catch (clientErr) {
            console.error("[Contact Inquiries] Exception acknowledging client:", clientErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage,
            emailDelivery: {
                adminNotified: !!adminNotifResult.success,
                clientAcknowledged: !!clientAckResult.success,
            },
        });
    } catch (error) {
        console.error("Create message error:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ================= UPDATE STATUS =================

const updateMessageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["New", "Read"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid message status",
            });
        }

        const updatedMessage =
            await Message.findByIdAndUpdate(
                id,
                { status },
                {
                    returnDocument: "after",
                    runValidators: true,
                }
            );

        if (!updatedMessage) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Message status updated successfully",
            data: updatedMessage,
        });
    } catch (error) {
        console.error(
            "Update message status error:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ================= DELETE MESSAGE =================

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedMessage =
            await Message.findByIdAndDelete(id);

        if (!deletedMessage) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Message deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete message error:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


module.exports = {
    getMessages,
    getMessageById,
    createMessage,
    updateMessageStatus,
    deleteMessage,
};