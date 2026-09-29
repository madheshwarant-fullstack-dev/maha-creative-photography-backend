const Package = require("../models/Package");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ================= IMAGE OPTIMIZATION =================

const optimizeImage = async (file) => {
    if (!file) {
        return null;
    }

    const uploadsDir = path.join(
        __dirname,
        "..",
        "uploads"
    );

    // Make sure uploads folder exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, {
            recursive: true,
        });
    }

    const optimizedFileName =
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        ".webp";

    const optimizedPath = path.join(
        uploadsDir,
        optimizedFileName
    );

    // Resize + compress + convert to WebP
    await sharp(file.path)
        .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({
            quality: 80,
        })
        .toFile(optimizedPath);

    // Delete original uploaded file
    if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }

    return `/uploads/${optimizedFileName}`;
};

// ================= DELETE OLD IMAGE =================

const deleteOldImage = (imagePath) => {
    try {
        if (!imagePath) {
            return;
        }

        // Only delete local uploaded images
        if (!imagePath.startsWith("/uploads/")) {
            return;
        }

        const fileName = path.basename(
            imagePath
        );

        const fullPath = path.join(
            __dirname,
            "..",
            "uploads",
            fileName
        );

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    } catch (error) {
        console.error(
            "Delete old image error:",
            error
        );
    }
};

// ================= GET ALL PACKAGES =================

const getPackages = async (req, res) => {
    try {
        const packages = await Package.find()
            .sort({
                createdAt: -1,
            });

        res.status(200).json({
            success: true,
            packages,
        });
    } catch (error) {
        console.error(
            "Get packages error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= GET PACKAGE BY ID =================

const getPackageById = async (req, res) => {
    try {
        const { packageId } = req.params;

        const packageData =
            await Package.findOne({
                packageId,
            });

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: "Package not found",
            });
        }

        res.status(200).json({
            success: true,
            package: packageData,
        });
    } catch (error) {
        console.error(
            "Get package error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= ADD PACKAGE =================

const addPackage = async (req, res) => {
    let optimizedImagePath = null;

    try {
        const {
            packageId,
            name,
            category,
            delivery,
            price,
            description,
            highlights,
        } = req.body;

        // ================= VALIDATION =================

        if (
            !packageId ||
            !name ||
            !category ||
            !delivery ||
            price === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Required package fields are missing",
            });
        }

        // ================= CHECK EXISTING PACKAGE =================

        const existingPackage =
            await Package.findOne({
                packageId,
            });

        if (existingPackage) {
            return res.status(400).json({
                success: false,
                message:
                    "Package ID already exists",
            });
        }

        // ================= IMAGE =================

        let image = "";

        if (req.file) {
            image =
                await optimizeImage(
                    req.file
                );

            optimizedImagePath = image;
        }

        // ================= HIGHLIGHTS =================

        let packageHighlights = [];

        if (Array.isArray(highlights)) {
            packageHighlights = highlights;
        } else if (
            typeof highlights === "string"
        ) {
            packageHighlights =
                highlights
                    .split(",")
                    .map((item) =>
                        item.trim()
                    )
                    .filter(Boolean);
        }

        // ================= CREATE PACKAGE =================

        const newPackage =
            await Package.create({
                packageId,
                name,
                category,
                delivery,
                price: Number(price),
                image,
                description:
                    description || "",
                highlights:
                    packageHighlights,
            });

        res.status(201).json({
            success: true,
            message:
                "Package added successfully",
            package: newPackage,
        });
    } catch (error) {
        console.error(
            "Add package error:",
            error
        );

        // If DB creation fails after image
        // optimization, remove optimized image
        if (optimizedImagePath) {
            deleteOldImage(
                optimizedImagePath
            );
        }

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= UPDATE PACKAGE =================

const updatePackage = async (req, res) => {
    let newImagePath = null;

    try {
        const { packageId } = req.params;

        // ================= FIND PACKAGE =================

        const packageData =
            await Package.findOne({
                packageId,
            });

        if (!packageData) {
            // Remove uploaded file if package
            // doesn't exist
            if (req.file) {
                try {
                    if (
                        fs.existsSync(
                            req.file.path
                        )
                    ) {
                        fs.unlinkSync(
                            req.file.path
                        );
                    }
                } catch (fileError) {
                    console.error(
                        "Uploaded file cleanup error:",
                        fileError
                    );
                }
            }

            return res.status(404).json({
                success: false,
                message: "Package not found",
            });
        }

        // ================= GET DATA =================

        const {
            name,
            category,
            delivery,
            price,
            description,
            highlights,
        } = req.body;

        // ================= UPDATE BASIC FIELDS =================

        if (name !== undefined) {
            packageData.name = name;
        }

        if (category !== undefined) {
            packageData.category =
                category;
        }

        if (delivery !== undefined) {
            packageData.delivery =
                delivery;
        }

        if (price !== undefined) {
            packageData.price =
                Number(price);
        }

        if (description !== undefined) {
            packageData.description =
                description;
        }

        // ================= UPDATE HIGHLIGHTS =================

        if (highlights !== undefined) {
            if (
                Array.isArray(
                    highlights
                )
            ) {
                packageData.highlights =
                    highlights;
            } else if (
                typeof highlights ===
                "string"
            ) {
                packageData.highlights =
                    highlights
                        .split(",")
                        .map((item) =>
                            item.trim()
                        )
                        .filter(Boolean);
            }
        }

        // ================= UPDATE IMAGE =================

        if (req.file) {
            const oldImage =
                packageData.image;

            // Optimize new image
            newImagePath =
                await optimizeImage(
                    req.file
                );

            // Set new image
            packageData.image =
                newImagePath;

            // Save package first
            const updatedPackage =
                await packageData.save();

            // Delete old image after successful save
            if (
                oldImage &&
                oldImage !== newImagePath
            ) {
                deleteOldImage(
                    oldImage
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Package updated successfully",
                package:
                    updatedPackage,
            });

            return;
        }

        // ================= SAVE WITHOUT IMAGE =================

        const updatedPackage =
            await packageData.save();

        res.status(200).json({
            success: true,
            message:
                "Package updated successfully",
            package: updatedPackage,
        });
    } catch (error) {
        console.error(
            "Update package error:",
            error
        );

        // Cleanup newly optimized image
        // if update fails
        if (newImagePath) {
            deleteOldImage(
                newImagePath
            );
        }

        // Cleanup original multer file
        if (req.file) {
            try {
                if (
                    fs.existsSync(
                        req.file.path
                    )
                ) {
                    fs.unlinkSync(
                        req.file.path
                    );
                }
            } catch (fileError) {
                console.error(
                    "File cleanup error:",
                    fileError
                );
            }
        }

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= DELETE PACKAGE =================

const deletePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const deletedPackage =
            await Package.findOneAndDelete({
                packageId,
            });

        if (!deletedPackage) {
            return res.status(404).json({
                success: false,
                message:
                    "Package not found",
            });
        }

        // Delete package image from uploads
        if (deletedPackage.image) {
            deleteOldImage(
                deletedPackage.image
            );
        }

        res.status(200).json({
            success: true,
            message:
                "Package deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete package error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= EXPORT =================

module.exports = {
    getPackages,
    getPackageById,
    addPackage,
    updatePackage,
    deletePackage,
};