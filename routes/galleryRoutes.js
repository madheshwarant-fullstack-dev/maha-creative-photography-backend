const express = require("express");
const multer = require("multer");

const {
    getGallery,
    addGallery,
    updateGallery,
    deleteGallery,
} = require("../controllers/galleryController");

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ================= MULTER STORAGE =================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
});


// ================= PUBLIC =================

// Client can view gallery
router.get(
    "/",
    getGallery
);


// ================= ADMIN =================

// Add gallery image
router.post(
    "/",
    protect,
    adminOnly,
    upload.single("image"),
    addGallery
);


// Update gallery image
router.put(
    "/:id",
    protect,
    adminOnly,
    upload.single("image"),
    updateGallery
);


// Delete gallery image
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteGallery
);


module.exports = router;