const Gallery = require("../models/Gallery");

// Get all gallery images
const getGallery = async (req, res) => {
    try {
        const gallery = await Gallery.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            gallery,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Add gallery image
const addGallery = async (req, res) => {
    try {
        const { title, category, description } = req.body;

        if (!title || !category || !req.file) {
            return res.status(400).json({
                success: false,
                message: "Title, category and image are required",
            });
        }

        const image = `/uploads/${req.file.filename}`;

        const gallery = await Gallery.create({
            title,
            category,
            image,
            description,
        });

        res.status(201).json({
            success: true,
            message: "Gallery image added successfully",
            gallery,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update gallery image
const updateGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, description } = req.body;

        const updateData = {
            title,
            category,
            description,
        };

        // If new image is selected
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        const gallery = await Gallery.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery image not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Gallery updated successfully",
            gallery,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete gallery image
const deleteGallery = async (req, res) => {
    try {
        const { id } = req.params;

        const gallery = await Gallery.findByIdAndDelete(id);

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery image not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Gallery image deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    getGallery,
    addGallery,
    updateGallery,
    deleteGallery,
};