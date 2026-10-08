const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
    {
        packageId: {
            type: String,
            required: [true, "Package ID is required"],
            unique: true,
            trim: true,
        },

        name: {
            type: String,
            required: [true, "Package name is required"],
            trim: true,
        },

        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },

        delivery: {
            type: String,
            required: [true, "Delivery timeline is required"],
            trim: true,
        },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price must be non-negative"],
        },

        // Permanent Cloudinary URL
        imageUrl: {
            type: String,
            trim: true,
            default: "",
        },

        // Cloudinary asset public_id for replacement/deletion
        publicId: {
            type: String,
            trim: true,
            default: "",
        },

        // Kept for backward compatibility with existing records
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

        highlights: {
            type: [String],
            default: [],
        },

        features: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Keep imageUrl and image synchronized, as well as highlights and features
packageSchema.pre("save", function () {
    if (this.imageUrl && !this.image) {
        this.image = this.imageUrl;
    } else if (this.image && !this.imageUrl) {
        this.imageUrl = this.image;
    }

    if (this.highlights && this.highlights.length > 0 && (!this.features || this.features.length === 0)) {
        this.features = this.highlights;
    } else if (this.features && this.features.length > 0 && (!this.highlights || this.highlights.length === 0)) {
        this.highlights = this.features;
    }
});

module.exports = mongoose.model("Package", packageSchema);