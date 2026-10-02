const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("FATAL ERROR: MONGO_URI environment variable is not defined!");
            console.error("Please set MONGO_URI in your .env file or Render environment variables.");
            process.exit(1);
        }

        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

