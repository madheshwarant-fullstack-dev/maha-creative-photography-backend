const Booking = require("../models/Booking");


// ================= GET ALL BOOKINGS =================
// Admin only

const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error(
            "Get bookings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= GET BOOKING BY ID =================
// Admin only

const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking =
            await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        res.status(200).json({
            success: true,
            booking,
        });
    } catch (error) {
        console.error(
            "Get booking by ID error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= GET MY BOOKINGS =================
// Logged-in client only

const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({
            userId: req.user.id,
        }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error(
            "Get my bookings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// ================= CREATE BOOKING =================
// Logged-in client

const createBooking = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            eventType,
            eventDate,
            location,
            message,
            packageId,
            packageName,
            packagePrice,
        } = req.body;


        // ================= VALIDATION =================

        if (
            !name ||
            !email ||
            !phone ||
            !eventType ||
            !eventDate ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Required booking fields are missing",
            });
        }


        // ================= CREATE BOOKING =================

        const booking =
            await Booking.create({
                // Logged-in user's MongoDB ID
                userId: req.user.id,

                name,
                email,
                phone,
                eventType,
                eventDate,
                location,
                message: message || "",

                packageId:
                    packageId || "",

                packageName:
                    packageName || "",

                packagePrice:
                    packagePrice !== undefined
                        ? Number(packagePrice)
                        : 0,

                status: "Pending",
            });


        // ================= RESPONSE =================

        res.status(201).json({
            success: true,
            message:
                "Booking created successfully",
            booking,
        });

    } catch (error) {
        console.error(
            "Create booking error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= UPDATE BOOKING STATUS =================
// Admin only

const updateBookingStatus = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const { status } = req.body;


        // ================= VALIDATE STATUS =================

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Completed",
            "Cancelled",
        ];

        if (
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking status",
            });
        }


        // ================= UPDATE =================

        const booking =
            await Booking.findByIdAndUpdate(
                id,
                {
                    status,
                },
                {
                    new: true,
                    runValidators: true,
                }
            );


        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }


        res.status(200).json({
            success: true,
            message:
                "Booking status updated successfully",
            booking,
        });

    } catch (error) {
        console.error(
            "Update booking status error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= DELETE BOOKING =================
// Admin only

const deleteBooking = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const booking =
            await Booking.findByIdAndDelete(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        res.status(200).json({
            success: true,
            message:
                "Booking deleted successfully",
        });

    } catch (error) {
        console.error(
            "Delete booking error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ================= EXPORT =================

module.exports = {
    getBookings,
    getBookingById,
    getMyBookings,
    createBooking,
    updateBookingStatus,
    deleteBooking,
};