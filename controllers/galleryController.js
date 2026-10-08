const fs = require("fs");
const path = require("path");
const Gallery = require("../models/Gallery");
const {
    uploadToCloudinary,
    deleteFromCloudinary,
} = require("../config/cloudinary");

// Helper to remove any legacy local uploads file from disk
const safeDeleteLocalFile = (imagePath) => {
    try {
        if (!imagePath || typeof imagePath !== "string") return;
        if (!imagePath.includes("/uploads/")) return;

        const fileName = path.basename(imagePath);
        const fullPath = path.join(__dirname, "..", "uploads", fileName);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    } catch (err) {
        console.warn("[Local File Cleanup] Error unlinking legacy file:", err.message);
    }
};

// ================= GET ALL GALLERY IMAGES =================
// Public endpoint for viewing gallery
const getGallery = async (req, res) => {
    try {
        const rawGallery = await Gallery.find().sort({ createdAt: -1 });

        // Normalize gallery items so both imageUrl and image are always available
        const gallery = rawGallery.map((item) => {
            const doc = item.toObject();
            const resolvedUrl = doc.imageUrl || doc.image || "";
            return {
                ...doc,
                imageUrl: resolvedUrl,
                image: resolvedUrl,
            };
        });

        res.status(200).json({
            success: true,
            gallery,
        });
    } catch (error) {
        console.error("[Gallery Error] Failed to fetch gallery:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch gallery images. " + error.message,
        });
    }
};

// ================= ADD GALLERY IMAGE =================
// Admin-only: Uploads to Cloudinary, stores permanent URL & publicId in MongoDB
const addGallery = async (req, res) => {
    try {
        const { title, category, description } = req.body;

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: "Title and category are required.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "An image file is required.",
            });
        }

        // 1. Upload image to Cloudinary in permanent folder
        const uploadResult = await uploadToCloudinary(
            req.file,
            "maha-creative/gallery"
        );

        // 2. Persist record to MongoDB
        const newGallery = await Gallery.create({
            title: title.trim(),
            category: category.trim(),
            imageUrl: uploadResult.secure_url,
            image: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            description: description ? description.trim() : "",
        });

        res.status(201).json({
            success: true,
            message: "Gallery image added successfully",
            gallery: newGallery,
        });
    } catch (error) {
        console.error("[Gallery Error] Failed to add gallery image:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add gallery image",
        });
    }
};

// ================= UPDATE GALLERY IMAGE =================
// Admin-only: Updates metadata. If a new image is provided, uploads new image first,
// updates DB, then safely removes the old Cloudinary asset.
const updateGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, description } = req.body;

        const existingGallery = await Gallery.findById(id);

        if (!existingGallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        // Prepare updated metadata
        if (title !== undefined) {
            existingGallery.title = title.trim();
        }
        if (category !== undefined) {
            existingGallery.category = category.trim();
        }
        if (description !== undefined) {
            existingGallery.description = description.trim();
        }

        // If admin selected a NEW image to replace the old one
        if (req.file) {
            const oldPublicId = existingGallery.publicId;
            const oldLocalImage = existingGallery.image;

            // 1. Upload new image to Cloudinary first
            const uploadResult = await uploadToCloudinary(
                req.file,
                "maha-creative/gallery"
            );

            // 2. Update image attributes
            existingGallery.imageUrl = uploadResult.secure_url;
            existingGallery.image = uploadResult.secure_url;
            existingGallery.publicId = uploadResult.public_id;

            // 3. Save to database FIRST
            const updatedGallery = await existingGallery.save();

            // 4. Delete old image ONLY after successful database save
            if (oldPublicId) {
                await deleteFromCloudinary(oldPublicId);
            } else if (oldLocalImage) {
                safeDeleteLocalFile(oldLocalImage);
            }

            return res.status(200).json({
                success: true,
                message: "Gallery image and details updated successfully",
                gallery: updatedGallery,
            });
        }

        // Admin did NOT select a new image -> KEEP EXISTING IMAGE UNCHANGED
        const updatedGallery = await existingGallery.save();

        res.status(200).json({
            success: true,
            message: "Gallery details updated successfully",
            gallery: updatedGallery,
        });
    } catch (error) {
        console.error("[Gallery Error] Failed to update gallery item:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update gallery image",
        });
    }
};

// ================= DELETE GALLERY IMAGE =================
// Admin-only: Safely removes image from Cloudinary, then removes record from MongoDB
const deleteGallery = async (req, res) => {
    try {
        const { id } = req.params;

        const existingGallery = await Gallery.findById(id);

        if (!existingGallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        // 1. Delete asset from Cloudinary if publicId exists
        if (existingGallery.publicId) {
            await deleteFromCloudinary(existingGallery.publicId);
        } else if (existingGallery.image) {
            // Clean up legacy local file if present
            safeDeleteLocalFile(existingGallery.image);
        }

        // 2. Delete database document
        await Gallery.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Gallery image deleted successfully",
        });
    } catch (error) {
        console.error("[Gallery Error] Failed to delete gallery item:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete gallery image",
        });
    }
};

module.exports = {
    getGallery,
    addGallery,
    updateGallery,
    deleteGallery,
};