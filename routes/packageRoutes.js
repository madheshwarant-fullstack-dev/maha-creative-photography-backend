const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    getPackages,
    getPackageById,
    addPackage,
    updatePackage,
    deletePackage,
} = require("../controllers/packageController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ================= IMAGE UPLOAD =================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes =
            /jpeg|jpg|png|webp/;

        const extension =
            allowedTypes.test(
                path.extname(
                    file.originalname
                ).toLowerCase()
            );

        const mimeType =
            allowedTypes.test(
                file.mimetype
            );

        if (extension && mimeType) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                )
            );
        }
    },
});

// ================= PUBLIC =================

router.get(
    "/",
    getPackages
);

router.get(
    "/:packageId",
    getPackageById
);

// ================= ADMIN =================

router.post(
    "/",
    protect,
    adminOnly,
    upload.single("image"),
    addPackage
);

router.put(
    "/:packageId",
    protect,
    adminOnly,
    upload.single("image"),
    updatePackage
);

router.delete(
    "/:packageId",
    protect,
    adminOnly,
    deletePackage
);

module.exports = router;