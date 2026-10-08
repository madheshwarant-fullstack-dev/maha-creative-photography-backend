const multer = require("multer");
const path = require("path");

// Use memoryStorage so uploaded images stay in memory buffer
// and stream directly to Cloudinary without writing to ephemeral local disks.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const mime = file.mimetype.toLowerCase();

    const isExtValid = allowedExtensions.test(ext);
    const isMimeValid = /image\/(jpeg|jpg|png|webp|gif)/.test(mime);

    if (isExtValid && isMimeValid) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed."
            )
        );
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB maximum file size
    },
    fileFilter,
});

module.exports = upload;
