const Gallery = require("../models/Gallery");
const {
    saveUploadedImage,
    deleteStoredImage,
} = require("../services/storageService");

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
// Admin-only: Uploads image via hybrid storage, stores URL & publicId in MongoDB
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

        // 1. Upload image (Cloudinary when configured, local disk fallback)
        const savedImage = await saveUploadedImage(
            req.file,
            "maha-creative/gallery"
        );

        // 2. Persist record to MongoDB
        const newGallery = await Gallery.create({
            title: title.trim(),
            category: category.trim(),
            imageUrl: savedImage.imageUrl,
            image: savedImage.image,
            publicId: savedImage.publicId,
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
// updates DB, then safely removes the old asset.
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
            const oldImage = existingGallery.image || existingGallery.imageUrl;

            // 1. Upload new image first
            const savedImage = await saveUploadedImage(
                req.file,
                "maha-creative/gallery"
            );

            // 2. Update image attributes
            existingGallery.imageUrl = savedImage.imageUrl;
            existingGallery.image = savedImage.image;
            existingGallery.publicId = savedImage.publicId;

            // 3. Save to database FIRST
            const updatedGallery = await existingGallery.save();

            // 4. Delete old image ONLY after successful database save
            await deleteStoredImage(oldPublicId, oldImage);

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
// Admin-only: Safely removes image asset, then removes record from MongoDB
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

        // 1. Delete asset from Cloudinary or local disk
        await deleteStoredImage(
            existingGallery.publicId,
            existingGallery.image || existingGallery.imageUrl
        );

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