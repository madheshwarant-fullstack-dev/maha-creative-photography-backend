const mongoose = require("mongoose");

/**
 * Middleware to validate MongoDB ObjectId in req.params.id
 * Returns 400 Bad Request with a clear message instead of throwing an unhandled Mongoose CastError.
 */
const validateObjectId = (paramName = "id") => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (id && !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ID format: '${id}'. Must be a 24-character hexadecimal string.`,
            });
        }
        next();
    };
};

module.exports = validateObjectId;
