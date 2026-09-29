const Message = require("../models/Message");

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

        const newMessage = await Message.create({
            name,
            email,
            phone: phone || "",
            subject: subject || "",
            message,
            status: "New",
        });

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage,
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
                    new: true,
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