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

const sharp = require("sharp");

/**
 * Optimizes an image buffer into a lightweight WebP image
 * suitable for fast web delivery and database persistence.
 *
 * @param {Buffer} buffer - Raw image buffer
 * @returns {Promise<Buffer>}
 */
const optimizeImageBuffer = async (buffer) => {
    try {
        return await sharp(buffer)
            .resize(1600, 1600, {
                fit: "inside",
                withoutEnlargement: true,
            })
            .webp({ quality: 82, effort: 4 })
            .toBuffer();
    } catch (err) {
        console.warn("[Storage Warning] Sharp WebP optimization failed, retaining original buffer:", err.message);
        return buffer;
    }
};

/**
 * Persists an uploaded image using Cloudinary (if configured)
 * or a permanent, web-optimized WebP Data URI with local disk backup.
 *
 * @param {Object} file - Multer file object
 * @param {string} folder - Destination folder for Cloudinary
 * @returns {Promise<{ imageUrl: string, image: string, publicId: string, storageType: string }>}
 */
const saveUploadedImage = async (file, folder = "maha-creative/gallery") => {
    if (!file) {
        throw new Error("No file provided for upload.");
    }

    const rawBuffer = Buffer.isBuffer(file) ? file : file.buffer;
    if (!rawBuffer) {
        throw new Error("Invalid file upload: no buffer available to persist.");
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
                `[Storage Error] Cloudinary upload failed: ${cloudErr.message}. Falling back to permanent database storage.`
            );
        }
    }

    // 2. Resilient Permanent Storage: Compress with Sharp to WebP & generate Data URI
    // This guarantees images NEVER 404, survive ephemeral cloud host restarts,
    // and sync flawlessly between local development and cloud production.
    const optimizedBuffer = await optimizeImageBuffer(rawBuffer);
    const dataUri = `data:image/webp;base64,${optimizedBuffer.toString("base64")}`;

    // 3. Save local file backup to uploads directory for local cache
    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(file.originalname || "").toLowerCase() || ".webp";
        const baseName = path
            .basename(file.originalname || "image", ext)
            .replace(/[^a-zA-Z0-9_-]/g, "_");
        const uniqueFileName = `${Date.now()}-${baseName}.webp`;
        const destinationPath = path.join(uploadsDir, uniqueFileName);

        fs.writeFileSync(destinationPath, optimizedBuffer);
        console.log(`[Storage] Image optimized and cached locally: uploads/${uniqueFileName}`);
    } catch (diskErr) {
        console.warn("[Storage Warning] Disk caching failed (non-critical):", diskErr.message);
    }

    return {
        imageUrl: dataUri,
        image: dataUri,
        publicId: "",
        storageType: "database_uri",
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
