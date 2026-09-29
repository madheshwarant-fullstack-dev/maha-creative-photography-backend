const mongoose = require("mongoose");
require("dotenv").config();

const Package = require("./models/Package");

const packages = [
    {
        packageId: "package-mini",
        name: "Package Mini",
        category: "AFFORDABLE",
        delivery: "65 Days Deliver",
        price: 15000,
        image: "",
        description: "",
        highlights: [
            "250 Photos",
            "24x8 Size Album (50 Pages)",
            "1 Photo Frame (12x8 Size)",
        ],
    },

    {
        packageId: "package-smart",
        name: "Package Smart",
        category: "AFFORDABLE",
        delivery: "65 Days Deliver",
        price: 20000,
        image: "/images/packages/smart.png",
        description: "Capture Moments, Create Memories",
        highlights: [
            "Unlimited Photos",
            "30x10 Size Album (70 Pages)",
            "10x12 Photo Frame",
        ],
    },

    {
        packageId: "package-smart-plus",
        name: "Package Smart Plus",
        category: "AFFORDABLE",
        delivery: "75 Days Deliver",
        price: 25000,
        image: "",
        description: "",
        highlights: [
            "Unlimited Photos",
            "24x18 Size Album (86 Pages)",
            "10x15 Photo Frame",
        ],
    },

    {
        packageId: "package-photo-golden",
        name: "Package Photo Golden",
        category: "AFFORDABLE",
        delivery: "80 Days Deliver",
        price: 30000,
        image: "",
        description: "",
        highlights: [
            "Unlimited Photos",
            "36x12 Size Album (100 Pages)",
            "15x12 Photo Frame",
        ],
    },

    {
        packageId: "silver-package",
        name: "Silver Package",
        category: "GRAND",
        delivery: "90 Days (Album Deliver)",
        price: 45000,
        image: "",
        description: "",
        highlights: [
            "Traditional Photography",
            "Traditional Videography",
            "Post Wedding Photography",
            "36x12 Album",
            "Calendar",
            "1 Photo Frame",
        ],
    },

    {
        packageId: "silver-plus-package",
        name: "Silver Plus Package",
        category: "GRAND",
        delivery: "90 Days (Album Deliver)",
        price: 50000,
        image: "",
        description: "",
        highlights: [
            "Traditional Photography",
            "Traditional Videography",
            "Post Wedding Photography",
            "Pre Wedding Photography",
            "Engagement Include",
            "36x12 Album",
            "Calendar",
            "1 Photo Frame",
        ],
    },

    {
        packageId: "golden-package",
        name: "Golden Package",
        category: "GRAND",
        delivery: "90 Days (Album Deliver)",
        price: 65000,
        image: "",
        description: "",
        highlights: [
            "Traditional Photography",
            "Traditional Videography",
            "Candid Photography",
            "Post Wedding Photography",
            "Pre Wedding Photography",
            "Engagement Include",
            "36x12 Album",
            "Calendar",
            "2 Photo Frame",
        ],
    },

    {
        packageId: "diamond-package",
        name: "Diamond Package",
        category: "GRAND",
        delivery: "90 Days (Album Delivery)",
        price: 85000,
        image: "",
        description: "",
        highlights: [
            "Traditional Photography",
            "Traditional Videography",
            "Candid Photography",
            "Candid Videography",
            "Post Wedding Photography",
            "Pre Wedding Photography",
            "Engagement Include",
            "36x12 Album",
            "Calendar",
            "Magazine",
            "3 Photo Frame",
        ],
    },

    {
        packageId: "premium-package",
        name: "Premium Package",
        category: "GRAND",
        delivery: "90 Days (Album Delivery)",
        price: 100000,
        image: "",
        description: "",
        highlights: [
            "Traditional Photography",
            "Traditional Videography",
            "Candid Photography",
            "Candid Videography",
            "Helicam",
            "Post Wedding Photography",
            "Pre Wedding Photography",
            "Engagement Include",
            "Magazine",
            "36x12 Album (2)",
            "Calendar",
            "3 Photo Frame",
        ],
    },
];

const seedPackages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");

        // Prevent duplicate packages
        for (const packageData of packages) {
            const existingPackage = await Package.findOne({
                packageId: packageData.packageId,
            });

            if (existingPackage) {
                console.log(
                    `Already exists: ${packageData.name}`
                );
            } else {
                await Package.create(packageData);

                console.log(
                    `Added: ${packageData.name}`
                );
            }
        }

        console.log("Package seeding completed!");

        await mongoose.connection.close();

        process.exit(0);
    } catch (error) {
        console.error(
            "Package seeding error:",
            error.message
        );

        process.exit(1);
    }
};

seedPackages();