const fs = require("fs");
const path = require("path");
const {
    isCloudinaryConfigured,
    uploadToCloudinary,
    deleteFromCloudinary,
} = require("../config/cloudinary");

const uploadsDir = path.join(__dirname, "..", "uploads");

// Helper to remove legacy local upload file from disk if present
const safeDeleteLocalFile = (imagePath) => {
    try {
        if (!imagePath || typeof imagePath !== "string") return;
        if (!imagePath.includes("/uploads/")) return;

        const fileName = path.basename(imagePath);
        const fullPath = path.join(uploadsDir, fileName);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`[Storage] Cleaned up local file: ${fileName}`);
        }
    } catch (err) {
        console.warn("[Local File Cleanup] Error unlinking legacy file:", err.message);
    }
};

/**
 * Persists an uploaded image using Cloudinary (if configured)
 * or permanent local disk storage as a reliable fallback.
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - Destination folder for Cloudinary
 * @returns {Promise<{ imageUrl: string, image: string, publicId: string, storageType: string }>}
 */
const saveUploadedImage = async (file, folder = "maha-creative/gallery") => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }

    // 1. If Cloudinary credentials are fully configured in .env, stream to Cloudinary
    if (isCloudinaryConfigured()) {
        try {
            console.log(`[Storage] Uploading to Cloudinary (folder: ${folder})...`);
            const uploadResult = await uploadToCloudinary(file, folder);
            return {
                imageUrl: uploadResult.secure_url,
                image: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                storageType: "cloudinary",
            };
        } catch (cloudErr) {
            console.error(
                `[Storage Error] Cloudinary upload failed: ${cloudErr.message}. Falling back to permanent local storage.`
            );
        }
    }

    // 2. Hybrid Fallback: Save permanently to local uploads directory
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const baseName = path
        .basename(file.originalname || "image", ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}-${baseName}${ext}`;
    const destinationPath = path.join(uploadsDir, uniqueFileName);

    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    if (!buffer) {
        throw new Error("Invalid file upload: no buffer available to persist.");
    }

    fs.writeFileSync(destinationPath, buffer);
    console.log(`[Storage] Image successfully stored locally: uploads/${uniqueFileName}`);

    const localUrl = `/uploads/${uniqueFileName}`;
    return {
        imageUrl: localUrl,
        image: localUrl,
        publicId: "",
        storageType: "local",
    };
};

/**
 * Removes an image asset from Cloudinary (if publicId exists) or disk (if local file).
 *
 * @param {string} publicId - Cloudinary asset public ID
 * @param {string} imagePath - File path / URL
 */
const deleteStoredImage = async (publicId, imagePath) => {
    if (publicId && isCloudinaryConfigured()) {
        try {
            await deleteFromCloudinary(publicId);
        } catch (err) {
            console.warn(`[Storage Warning] Cloudinary delete failed for publicId ${publicId}:`, err.message);
        }
    } else if (imagePath) {
        safeDeleteLocalFile(imagePath);
    }
};

module.exports = {
    saveUploadedImage,
    deleteStoredImage,
    safeDeleteLocalFile,
};
