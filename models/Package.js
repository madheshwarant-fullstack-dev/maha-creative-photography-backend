const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
    {
        packageId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        delivery: {
            type: String,
            required: true,
            trim: true,
        },

        price: {
            type: Number,
            required: true,
        },

        image: {
            type: String,
            default: "",
        },

        description: {
            type: String,
            default: "",
        },

        highlights: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Package", packageSchema);