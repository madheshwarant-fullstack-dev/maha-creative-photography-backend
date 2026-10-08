const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
require("dotenv").config();

// Configure Cloudinary SDK with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Checks if Cloudinary credentials are fully defined in the environment.
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_CLOUD_NAME !== "your_cloudinary_cloud_name" &&
        process.env.CLOUDINARY_API_KEY !== "your_cloudinary_api_key" &&
        process.env.CLOUDINARY_API_SECRET !== "your_cloudinary_api_secret"
    );
};

/**
 * Uploads an image (Buffer, Multer file object, or local file path) to Cloudinary.
 *
 * @param {Object|Buffer|string} file - Multer file with .buffer or .path, raw Buffer, or file path string
 * @param {string} folder - Destination folder path inside Cloudinary
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadToCloudinary = async (file, folder = "maha-creative") => {
    if (!isCloudinaryConfigured()) {
        throw new Error(
            "Cloudinary credentials are not configured. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend .env file."
        );
    }

    if (!file) {
        throw new Error("No file provided for upload.");
    }

    const options = {
        folder,
        resource_type: "image",
        quality: "auto:good",
        fetch_format: "auto",
    };

    // Case 1: Local file path string (e.g., during database migration)
    if (typeof file === "string") {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(file, options, (error, result) => {
                if (error) {
                    console.error("[Cloudinary Error] File path upload failed:", error);
                    return reject(error);
                }
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            });
        });
    }

    // Case 2: Multer disk storage file with .path
    if (file.path && typeof file.path === "string") {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(file.path, options, (error, result) => {
                if (error) {
                    console.error("[Cloudinary Error] Disk file upload failed:", error);
                    return reject(error);
                }
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            });
        });
    }

    // Case 3: Multer memory storage file with .buffer or raw Buffer
    const buffer = Buffer.isBuffer(file) ? file : file.buffer;

    if (!buffer) {
        throw new Error("Invalid file format: neither buffer nor file path found.");
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    console.error("[Cloudinary Error] Stream upload failed:", error);
                    return reject(error);
                }
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

/**
 * Safely removes an image asset from Cloudinary by its public_id.
 *
 * @param {string} publicId - Cloudinary asset public_id
 * @returns {Promise<{ result: string }>}
 */
const deleteFromCloudinary = async (publicId) => {
    if (!publicId || typeof publicId !== "string") {
        return { result: "not_found" };
    }

    // Skip if publicId is a full HTTP URL or local /uploads path
    if (
        publicId.startsWith("http://") ||
        publicId.startsWith("https://") ||
        publicId.startsWith("/uploads/") ||
        publicId.startsWith("uploads/")
    ) {
        console.warn(`[Cloudinary Warning] Skipped deleting invalid public_id: ${publicId}`);
        return { result: "ignored" };
    }

    if (!isCloudinaryConfigured()) {
        console.warn("[Cloudinary Warning] Skipping deletion: Cloudinary credentials not configured.");
        return { result: "not_configured" };
    }

    try {
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });
        return response;
    } catch (error) {
        console.error(`[Cloudinary Error] Failed to delete public_id ${publicId}:`, error.message);
        return { result: "error", error: error.message };
    }
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    uploadToCloudinary,
    deleteFromCloudinary,
};
