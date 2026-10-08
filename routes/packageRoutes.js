const express = require("express");
const upload = require("../middleware/upload");

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

// ================= PUBLIC ROUTES =================
// Anyone can view packages or single package
router.get("/", getPackages);
router.get("/:packageId", getPackageById);

// ================= ADMIN-ONLY ROUTES =================
// Add package with optional permanent image upload
router.post(
    "/",
    protect,
    adminOnly,
    upload.single("image"),
    addPackage
);

// Update package details / replace image safely
router.put(
    "/:packageId",
    protect,
    adminOnly,
    upload.single("image"),
    updatePackage
);

// Delete package and its Cloudinary image asset
router.delete(
    "/:packageId",
    protect,
    adminOnly,
    deletePackage
);

module.exports = router;