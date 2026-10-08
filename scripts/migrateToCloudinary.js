const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Gallery = require("../models/Gallery");
const Package = require("../models/Package");
const {
    isCloudinaryConfigured,
    uploadToCloudinary,
} = require("../config/cloudinary");

async function migrate() {
    console.log("=================================================");
    console.log("   Maha Creative Photography - Image Migration   ");
    console.log("=================================================");

    if (!isCloudinaryConfigured()) {
        console.error("\n[Error] Cloudinary credentials are not configured in backend/.env!");
        console.error("Please add the following valid credentials to backend/.env first:");
        console.error("  CLOUDINARY_CLOUD_NAME=your_cloud_name");
        console.error("  CLOUDINARY_API_KEY=your_api_key");
        console.error("  CLOUDINARY_API_SECRET=your_api_secret\n");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully.\n");

        const uploadsDir = path.join(__dirname, "..", "uploads");

        // 1. Migrate Gallery Images
        console.log("--- Checking Gallery Collection ---");
        const galleryItems = await Gallery.find();
        let galleryMigrated = 0;

        for (const item of galleryItems) {
            const currentImg = item.image || item.imageUrl || "";

            if (item.publicId && currentImg.includes("cloudinary.com")) {
                console.log(`[Skip] Gallery item "${item.title}" is already stored on Cloudinary.`);
                continue;
            }

            if (currentImg.includes("/uploads/")) {
                const fileName = path.basename(currentImg);
                const localFilePath = path.join(uploadsDir, fileName);

                if (fs.existsSync(localFilePath)) {
                    console.log(`[Migrating] Uploading gallery image "${fileName}" to Cloudinary...`);
                    const result = await uploadToCloudinary(localFilePath, "maha-creative/gallery");

                    item.imageUrl = result.secure_url;
                    item.image = result.secure_url;
                    item.publicId = result.public_id;
                    await item.save();

                    console.log(`[Success] Gallery "${item.title}" migrated -> ${result.secure_url}`);
                    galleryMigrated++;
                } else {
                    console.warn(`[Warning] Local file "${fileName}" not found in uploads folder for gallery item "${item.title}". Record preserved.`);
                }
            }
        }
        console.log(`Gallery migration complete: ${galleryMigrated} items migrated.\n`);

        // 2. Migrate Package Images
        console.log("--- Checking Package Collection ---");
        const packageItems = await Package.find();
        let packagesMigrated = 0;

        for (const pkg of packageItems) {
            const currentImg = pkg.image || pkg.imageUrl || "";

            if (pkg.publicId && currentImg.includes("cloudinary.com")) {
                console.log(`[Skip] Package "${pkg.name}" is already stored on Cloudinary.`);
                continue;
            }

            if (currentImg.includes("/uploads/")) {
                const fileName = path.basename(currentImg);
                const localFilePath = path.join(uploadsDir, fileName);

                if (fs.existsSync(localFilePath)) {
                    console.log(`[Migrating] Uploading package image "${fileName}" to Cloudinary...`);
                    const result = await uploadToCloudinary(localFilePath, "maha-creative/packages");

                    pkg.imageUrl = result.secure_url;
                    pkg.image = result.secure_url;
                    pkg.publicId = result.public_id;
                    await pkg.save();

                    console.log(`[Success] Package "${pkg.name}" migrated -> ${result.secure_url}`);
                    packagesMigrated++;
                } else {
                    console.warn(`[Warning] Local file "${fileName}" not found in uploads folder for package "${pkg.name}". Record preserved.`);
                }
            }
        }
        console.log(`Package migration complete: ${packagesMigrated} items migrated.\n`);

        console.log("=================================================");
        console.log("Migration summary:");
        console.log(`- Gallery items migrated: ${galleryMigrated}`);
        console.log(`- Package items migrated: ${packagesMigrated}`);
        console.log("=================================================\n");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed with error:", err);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrate();
