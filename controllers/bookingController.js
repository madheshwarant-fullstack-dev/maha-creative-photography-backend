const Booking = require("../models/Booking");
const {
    sendBookingPendingEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
    sendAdminBookingNotification,
} = require("../services/emailService");


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


        // ================= SEND NOTIFICATION EMAILS =================
        let clientEmailResult = { success: false };
        let adminEmailResult = { success: false };

        try {
            // 1. Send pending confirmation to client
            clientEmailResult = await sendBookingPendingEmail(booking);
            if (!clientEmailResult.success) {
                console.warn(
                    `[Booking Notice] Client confirmation email could not be sent to ${booking.email}:`,
                    clientEmailResult.error || "Unknown error"
                );
            }
        } catch (emailError) {
            console.error(
                "[Booking Notice] Exception sending client email:",
                emailError.message
            );
        }

        try {
            // 2. Send new booking notification to admin
            adminEmailResult = await sendAdminBookingNotification({
                booking,
                type: "NEW_BOOKING",
            });
            if (!adminEmailResult.success) {
                console.warn(
                    "[Booking Notice] Admin booking notification email could not be sent:",
                    adminEmailResult.error || "Unknown error"
                );
            }
        } catch (adminEmailError) {
            console.error(
                "[Booking Notice] Exception sending admin notification email:",
                adminEmailError.message
            );
        }

        // ================= RESPONSE =================

        res.status(201).json({
            success: true,
            message: "Booking submitted successfully! A confirmation email has been sent.",
            booking,
            emailDelivery: {
                clientSent: !!clientEmailResult.success,
                adminSent: !!adminEmailResult.success,
                recipient: booking.email,
                ...(!clientEmailResult.success && clientEmailResult.error
                    ? { clientNote: clientEmailResult.error }
                    : {}),
            },
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
        const { status, reason, cancellationReason } = req.body;


        // ================= VALIDATE STATUS =================

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Completed",
            "Cancelled",
        ];

        const matchedStatus = allowedStatuses.find(
            (s) => s.toLowerCase() === (status || "").toLowerCase()
        );

        if (!matchedStatus) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking status",
            });
        }


        // ================= FIND BOOKING =================

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        const oldStatus = booking.status;
        const newStatus = matchedStatus;
        const forceResend = req.body.forceResend === true || req.query.resend === "true";

        booking.status = newStatus;
        await booking.save();


        // ================= SEND STATUS EMAIL =================
        let statusEmailResult = null;
        let adminEmailResult = null;

        // Trigger email if status changed, or if forceResend requested, or if confirmed
        const shouldSend = forceResend || oldStatus.toLowerCase() !== newStatus.toLowerCase();

        if (shouldSend) {
            try {
                if (newStatus.toLowerCase() === "confirmed") {
                    // 1. Send confirmation email to client
                    statusEmailResult = await sendBookingConfirmedEmail(booking);
                    // 2. Notify studio admin that booking is confirmed
                    adminEmailResult = await sendAdminBookingNotification({
                        booking,
                        type: "BOOKING_CONFIRMED",
                    });
                } else if (newStatus.toLowerCase() === "cancelled") {
                    // 1. Send cancellation email to client
                    statusEmailResult = await sendBookingCancelledEmail(
                        booking,
                        cancellationReason || reason || ""
                    );
                    // 2. Notify studio admin that booking is cancelled
                    adminEmailResult = await sendAdminBookingNotification({
                        booking,
                        type: "BOOKING_CANCELLED",
                        cancellationReason: cancellationReason || reason || "",
                    });
                } else if (newStatus.toLowerCase() === "pending") {
                    statusEmailResult = await sendBookingPendingEmail(booking);
                }

                if (statusEmailResult && !statusEmailResult.success) {
                    console.warn(
                        `[Booking Status Update] Email delivery to ${booking.email} failed:`,
                        statusEmailResult.error || "Unknown error"
                    );
                }
            } catch (emailError) {
                console.error(
                    "Booking status updated, but email notification failed:",
                    emailError.message
                );
            }
        }


        res.status(200).json({
            success: true,
            message: `Booking status updated to ${newStatus} successfully`,
            booking,
            emailDelivery: {
                clientSent: !!(statusEmailResult && statusEmailResult.success),
                adminSent: !!(adminEmailResult && adminEmailResult.success),
                recipient: booking.email,
                ...(statusEmailResult && !statusEmailResult.success
                    ? { error: statusEmailResult.error }
                    : {}),
            },
            emailSent: !!(statusEmailResult && statusEmailResult.success),
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