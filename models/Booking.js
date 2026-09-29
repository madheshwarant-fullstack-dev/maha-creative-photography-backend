const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        // ================= USER =================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // ================= CLIENT DETAILS =================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        // ================= EVENT DETAILS =================

        eventType: {
            type: String,
            required: true,
            trim: true,
        },

        eventDate: {
            type: Date,
            required: true,
        },

        location: {
            type: String,
            required: true,
            trim: true,
        },

        message: {
            type: String,
            default: "",
        },

        // ================= PACKAGE DETAILS =================

        packageId: {
            type: String,
            default: "",
        },

        packageName: {
            type: String,
            default: "",
        },

        packagePrice: {
            type: Number,
            default: 0,
        },

        // ================= BOOKING STATUS =================

        status: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Completed",
                "Cancelled",
            ],
            default: "Pending",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "Booking",
    bookingSchema
);