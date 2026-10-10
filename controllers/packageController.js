const Package = require("../models/Package");
const mongoose = require("mongoose");
const {
    saveUploadedImage,
    deleteStoredImage,
} = require("../services/storageService");

// Query helper: find by packageId slug or MongoDB _id
const buildPackageQuery = (idOrSlug) => {
    if (!idOrSlug) return { _id: null };
    const queries = [{ packageId: idOrSlug }];
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        queries.push({ _id: idOrSlug });
    }
    return { $or: queries };
};

// Normalize package document to ensure imageUrl and image are consistent
const normalizePackage = (pkgDoc) => {
    const doc = pkgDoc.toObject ? pkgDoc.toObject() : { ...pkgDoc };
    const resolvedUrl = doc.imageUrl || doc.image || "";
    const highlights = Array.isArray(doc.highlights)
        ? doc.highlights
        : (Array.isArray(doc.features) ? doc.features : []);

    return {
        ...doc,
        imageUrl: resolvedUrl,
        image: resolvedUrl,
        highlights,
        features: highlights,
    };
};

// ================= GET ALL PACKAGES =================
// Public endpoint for clients to view photography packages
const getPackages = async (req, res) => {
    try {
        const rawPackages = await Package.find().sort({ createdAt: -1 });
        const packages = rawPackages.map(normalizePackage);

        res.status(200).json({
            success: true,
            packages,
        });
    } catch (error) {
        console.error("[Package Error] Get packages failed:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch packages. " + error.message,
        });
    }
};

// ================= GET PACKAGE BY ID =================
// Public endpoint for package detail view
const getPackageById = async (req, res) => {
    try {
        const { packageId } = req.params;
        const packageData = await Package.findOne(buildPackageQuery(packageId));

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: "Package not found",
            });
        }

        res.status(200).json({
            success: true,
            package: normalizePackage(packageData),
        });
    } catch (error) {
        console.error("[Package Error] Get package by ID failed:", error);
        res.status(500).json({
            success: false,
            message: "Server error retrieving package. " + error.message,
        });
    }
};

// ================= ADD PACKAGE =================
// Admin-only: Creates package, optionally uploads image to Cloudinary
const addPackage = async (req, res) => {
    try {
        const {
            packageId,
            name,
            category,
            delivery,
            price,
            description,
            highlights,
            features,
        } = req.body;

        // Validation
        if (!packageId || !name || !category || !delivery || price === undefined || price === "") {
            return res.status(400).json({
                success: false,
                message: "Required package fields are missing (packageId, name, category, delivery, price).",
            });
        }

        // Check if packageId already exists
        const existingPackage = await Package.findOne({ packageId: packageId.trim() });
        if (existingPackage) {
            return res.status(400).json({
                success: false,
                message: `Package ID '${packageId}' already exists. Please choose a unique ID.`,
            });
        }

        // Parse highlights / features
        let packageHighlights = [];
        const rawList = highlights || features;
        if (Array.isArray(rawList)) {
            packageHighlights = rawList;
        } else if (typeof rawList === "string") {
            // Support both comma-separated and newline-separated inputs
            packageHighlights = rawList
                .split(/[\r\n,]+/)
                .map((item) => item.trim())
                .filter(Boolean);
        }

        let imageUrl = "";
        let publicId = "";

        // If admin uploaded an image file
        if (req.file) {
            const savedImage = await saveUploadedImage(
                req.file,
                "maha-creative/packages"
            );
            imageUrl = savedImage.imageUrl;
            publicId = savedImage.publicId;
        }

        const newPackage = await Package.create({
            packageId: packageId.trim(),
            name: name.trim(),
            category: category.trim(),
            delivery: delivery.trim(),
            price: Number(price),
            imageUrl,
            image: imageUrl,
            publicId,
            description: description ? description.trim() : "",
            highlights: packageHighlights,
            features: packageHighlights,
        });

        res.status(201).json({
            success: true,
            message: "Package added successfully",
            package: normalizePackage(newPackage),
        });
    } catch (error) {
        console.error("[Package Error] Add package failed:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add package",
        });
    }
};

// ================= UPDATE PACKAGE =================
// Admin-only: Updates package details. If a new image is provided,
// uploads new image first, updates MongoDB, then removes old Cloudinary asset.
const updatePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const packageData = await Package.findOne(buildPackageQuery(packageId));

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: "Package not found",
            });
        }

        const {
            name,
            category,
            delivery,
            price,
            description,
            highlights,
            features,
        } = req.body;

        // Update fields if provided
        if (name !== undefined) packageData.name = name.trim();
        if (category !== undefined) packageData.category = category.trim();
        if (delivery !== undefined) packageData.delivery = delivery.trim();
        if (price !== undefined && price !== "") packageData.price = Number(price);
        if (description !== undefined) packageData.description = description.trim();

        // Update highlights / features
        const rawList = highlights !== undefined ? highlights : features;
        if (rawList !== undefined) {
            if (Array.isArray(rawList)) {
                packageData.highlights = rawList;
                packageData.features = rawList;
            } else if (typeof rawList === "string") {
                const parsed = rawList
                    .split(/[\r\n,]+/)
                    .map((item) => item.trim())
                    .filter(Boolean);
                packageData.highlights = parsed;
                packageData.features = parsed;
            }
        }

        // If admin selected a NEW image to replace the old one
        if (req.file) {
            const oldPublicId = packageData.publicId;
            const oldImage = packageData.image || packageData.imageUrl;

            // 1. Upload new image first
            const savedImage = await saveUploadedImage(
                req.file,
                "maha-creative/packages"
            );

            // 2. Set new image values on document
            packageData.imageUrl = savedImage.imageUrl;
            packageData.image = savedImage.image;
            packageData.publicId = savedImage.publicId;

            // 3. Save to database FIRST
            const updatedPackage = await packageData.save();

            // 4. Delete old image ONLY after successful database update
            await deleteStoredImage(oldPublicId, oldImage);

            return res.status(200).json({
                success: true,
                message: "Package and image updated successfully",
                package: normalizePackage(updatedPackage),
            });
        }

        // Admin did NOT select a new image -> KEEP EXISTING IMAGE UNCHANGED
        const updatedPackage = await packageData.save();

        res.status(200).json({
            success: true,
            message: "Package updated successfully",
            package: normalizePackage(updatedPackage),
        });
    } catch (error) {
        console.error("[Package Error] Update package failed:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update package",
        });
    }
};

// ================= DELETE PACKAGE =================
// Admin-only: Deletes image from Cloudinary, then removes record from MongoDB
const deletePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const packageData = await Package.findOne(buildPackageQuery(packageId));

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: "Package not found",
            });
        }

        // 1. Delete image asset if present
        await deleteStoredImage(
            packageData.publicId,
            packageData.image || packageData.imageUrl
        );

        // 2. Delete database document
        await Package.findOneAndDelete(buildPackageQuery(packageId));

        res.status(200).json({
            success: true,
            message: "Package deleted successfully",
        });
    } catch (error) {
        console.error("[Package Error] Delete package failed:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete package",
        });
    }
};

module.exports = {
    getPackages,
    getPackageById,
    addPackage,
    updatePackage,
    deletePackage,
};