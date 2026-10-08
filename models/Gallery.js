const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },

        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },

        // Permanent Cloudinary URL
        imageUrl: {
            type: String,
            trim: true,
            default: "",
        },

        // Cloudinary asset public_id for permanent deletion/replacement
        publicId: {
            type: String,
            trim: true,
            default: "",
        },

        // Kept for backward compatibility with existing records & legacy UI
        image: {
            type: String,
            trim: true,
            default: "",
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Keep imageUrl and image synchronized before saving
gallerySchema.pre("save", function () {
    if (this.imageUrl && !this.image) {
        this.image = this.imageUrl;
    } else if (this.image && !this.imageUrl) {
        this.imageUrl = this.image;
    }
});

module.exports = mongoose.model("Gallery", gallerySchema);