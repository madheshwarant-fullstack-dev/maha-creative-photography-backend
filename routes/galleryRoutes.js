const express = require("express");
const upload = require("../middleware/upload");

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
const validateObjectId = require("../middleware/validateId");

const router = express.Router();

// ================= PUBLIC ROUTES =================
// Anyone can view the photography gallery
router.get("/", getGallery);

// ================= ADMIN-ONLY ROUTES =================
// Add gallery image: Cloudinary upload -> MongoDB persistence
router.post(
    "/",
    protect,
    adminOnly,
    upload.single("image"),
    addGallery
);

// Update gallery image / details: Non-destructive, handles replacement safely
router.put(
    "/:id",
    protect,
    adminOnly,
    validateObjectId("id"),
    upload.single("image"),
    updateGallery
);

// Delete gallery image: Removes Cloudinary asset & MongoDB document
router.delete(
    "/:id",
    protect,
    adminOnly,
    validateObjectId("id"),
    deleteGallery
);

module.exports = router;