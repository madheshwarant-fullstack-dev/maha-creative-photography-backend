const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        role: {
            type: String,
            enum: ["user", "client", "admin"],
            default: "user",
        },

        resetPasswordToken: {
            type: String,
            default: null,
        },

        resetPasswordExpires: {
            type: Date,
            default: null,
        },

        resetPasswordRole: {
            type: String,
            enum: ["user", "admin", null],
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                return ret;
            },
        },
        toObject: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                return ret;
            },
        },
    }
);

module.exports = mongoose.model("User", userSchema);