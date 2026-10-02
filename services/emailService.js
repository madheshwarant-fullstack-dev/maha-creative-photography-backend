const nodemailer = require("nodemailer");

/**
 * Creates nodemailer transporter if email credentials are configured in .env.
 * Returns null if not configured (development/preview mode).
 */
const createTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    if (!user || !pass) {
        return null;
    }

    if (process.env.EMAIL_HOST) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10) || 587,
            secure:
                process.env.EMAIL_SECURE === "true" ||
                process.env.EMAIL_PORT === "465",
            auth: { user, pass },
        });
    }

    // Default to Gmail service
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
};

/**
 * Formats a Date object to a readable date string (e.g. 15 October 2026)
 */
const formatEventDate = (date) => {
    if (!date) return "Date to be scheduled";
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    } catch {
        return String(date);
    }
};

/**
 * Formats time from eventDate or fallback schedule string
 */
const formatEventTime = (date) => {
    if (!date) return "To be coordinated with photographer";
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "To be coordinated with photographer";
        const hours = d.getHours();
        const minutes = d.getMinutes();
        if (hours !== 0 || minutes !== 0) {
            return d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
        }
        return "To be coordinated with photographer";
    } catch {
        return "To be coordinated with photographer";
    }
};

// =========================================================================
// PASSWORD RESET EMAIL TEMPLATE
// =========================================================================

/**
 * Generates responsive, luxury HTML template for Maha Creative Photography Password Reset
 */
const buildPasswordResetEmailHtml = ({ resetUrl, role = "user", userName = "" }) => {
    const isAdmin = role === "admin";
    const portalTitle = isAdmin
        ? "Admin Account Security"
        : "Client Account Security";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f0f11;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #e5e7eb;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0f11;
      padding: 40px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #111111, #1a1a1e);
      padding: 35px 30px;
      text-align: center;
      border-bottom: 2px solid #ff1493;
    }
    .brand-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 0 0 6px 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: #ff1493;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin: 0;
      font-weight: 600;
    }
    .content {
      padding: 35px 30px;
    }
    .salutation {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .lead {
      color: #d1d5db;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn-reset {
      display: inline-block;
      background: #ff1493;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 14px 34px;
      border-radius: 6px;
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4);
      transition: background 0.3s ease;
    }
    .btn-reset:hover {
      background: #e01282;
    }
    .link-note {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 25px;
      word-break: break-all;
      line-height: 1.6;
      padding: 12px;
      background: #202025;
      border-radius: 6px;
    }
    .link-note a {
      color: #ff1493;
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background-color: #27272a;
      margin: 30px 0 20px 0;
    }
    .security-notice {
      color: #9ca3af;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      background-color: #121215;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #27272a;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Maha Creative Photography</h1>
        <p class="brand-subtitle">${portalTitle}</p>
      </div>
      
      <div class="content">
        <p class="salutation">Hello${userName ? ` ${userName}` : ""},</p>
        
        <p class="lead">
          You requested a password reset.
        </p>

        <p class="lead">
          Click the button below to create a new password.
        </p>

        <div class="btn-container">
          <a href="${resetUrl}" class="btn-reset" target="_blank" rel="noopener noreferrer">
            Reset Password
          </a>
        </div>

        <p class="security-notice" style="color: #f59e0b; font-weight: 500;">
          &#9888; This link will expire after a limited time (1 hour).
        </p>

        <div class="link-note">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        </div>

        <div class="divider"></div>

        <p class="security-notice">
          If you did not request this, you can safely ignore this email. Your current password remains active and secure.
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Maha Creative Photography. All rights reserved.</p>
        <p style="margin-top: 6px;">Capturing moments that last forever.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Sends password reset email or logs to console if SMTP is not configured.
 */
const sendPasswordResetEmail = async ({
    to,
    resetUrl,
    role = "user",
    userName = "",
}) => {
    const transporter = createTransporter();
    const isAdmin = role === "admin";
    const subject = isAdmin
        ? "Maha Creative Photography - Admin Password Reset Request"
        : "Maha Creative Photography - Password Reset Request";

    const textContent = `Maha Creative Photography

You requested a password reset.

Click the button below to create a new password:
${resetUrl}

This link will expire after a limited time (1 hour).

If you did not request this, you can safely ignore this email.`;

    const htmlContent = buildPasswordResetEmailHtml({ resetUrl, role, userName });

    // Fallback if SMTP is not configured in local environment
    if (!transporter) {
        console.log("\n=======================================================");
        console.log(" [EMAIL SERVICE NOTICE: SMTP Credentials Not Configured]");
        console.log(` To: ${to}`);
        console.log(` Subject: ${subject}`);
        console.log(` Role: ${role}`);
        console.log(` Reset URL: ${resetUrl}`);
        console.log(" Add EMAIL_USER & EMAIL_PASSWORD to .env for real delivery.");
        console.log("=======================================================\n");
        return {
            success: true,
            devMode: true,
            resetUrl,
        };
    }

    const fromAddress =
        process.env.EMAIL_FROM ||
        `"Maha Creative Photography" <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
    });

    return {
        success: true,
        messageId: info.messageId,
    };
};

// =========================================================================
// BOOKING NOTIFICATION EMAIL TEMPLATES & SENDERS
// =========================================================================

/**
 * Builds responsive luxury HTML email for booking status transitions (Pending, Confirmed, Cancelled)
 */
const buildBookingEmailHtml = ({ booking, status, cancellationReason = "" }) => {
    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();
    const formattedDate = formatEventDate(booking.eventDate);
    const formattedTime = formatEventTime(booking.eventDate);
    const formattedAmount = `₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}`;
    const bookingId = booking._id ? booking._id.toString() : "N/A";
    const userName = booking.name || "Valued Client";
    const serviceName = booking.eventType || "Photography Session";
    const packageName = booking.packageName || "Standard Photography Package";
    const location = booking.location || "To be specified";

    const frontendUrl = (
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const myBookingsUrl = `${frontendUrl}/my-bookings`;

    const logoUrl =
        process.env.EMAIL_LOGO_URL ||
        (process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/images/Logo.png`
            : null);

    // Color accents & messages per status
    let statusColor = "#f59e0b"; // Amber (Pending)
    let statusBg = "#2e220a";
    let statusBorder = "#78350f";
    let statusBadgeText = "PENDING";
    let introLead = "Thank you for choosing Maha Creative Photography.";
    let introMessage = "Your booking request has been successfully received and is currently pending confirmation.";
    let closingMessage = "Our team will review your booking and update the status soon.";

    if (normalizedStatus === "CONFIRMED") {
        statusColor = "#10b981"; // Emerald
        statusBg = "#06281e";
        statusBorder = "#047857";
        statusBadgeText = "CONFIRMED";
        introLead = "Great news!";
        introMessage = "Your booking with Maha Creative Photography has been confirmed.";
        closingMessage = "We look forward to capturing your special moments.";
    } else if (normalizedStatus === "CANCELLED") {
        statusColor = "#ef4444"; // Rose/Red
        statusBg = "#2d0e0e";
        statusBorder = "#991b1b";
        statusBadgeText = "CANCELLED";
        introLead = "";
        introMessage = "We are sorry to inform you that your booking with Maha Creative Photography has been cancelled.";
        closingMessage = "If you have any questions, please contact our team.";
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maha Creative Photography - Booking ${normalizedStatus}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f0f11;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #e5e7eb;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0f11;
      padding: 40px 15px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #111111, #1a1a1e);
      padding: 35px 30px;
      text-align: center;
      border-bottom: 2px solid #ff1493;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 0 0 6px 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: #ff1493;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin: 0;
      font-weight: 600;
    }
    .content {
      padding: 35px 30px;
    }
    .salutation {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 14px;
    }
    .lead-text {
      color: #d1d5db;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .status-badge-container {
      text-align: center;
      margin: 25px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      background-color: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }
    .card-details {
      background-color: #1f1f23;
      border: 1px solid #2e2e33;
      border-radius: 10px;
      padding: 22px 24px;
      margin: 28px 0;
    }
    .card-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #ff1493;
      margin-top: 0;
      margin-bottom: 18px;
      font-weight: 700;
      border-bottom: 1px solid #2e2e33;
      padding-bottom: 8px;
    }
    .detail-table {
      width: 100%;
      border-collapse: collapse;
    }
    .detail-table td {
      padding: 9px 0;
      font-size: 14px;
      vertical-align: top;
    }
    .detail-label {
      color: #9ca3af;
      width: 38%;
      font-weight: 500;
    }
    .detail-value {
      color: #ffffff;
      font-weight: 600;
      text-align: right;
    }
    .detail-value.highlight {
      color: #ff1493;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0 20px 0;
    }
    .btn-action {
      display: inline-block;
      background: #ff1493;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 12px 28px;
      border-radius: 6px;
      box-shadow: 0 4px 15px rgba(255, 20, 147, 0.35);
    }
    .closing {
      color: #9ca3af;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 20px;
    }
    .footer {
      background-color: #121215;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #27272a;
    }
    .footer p {
      margin: 0;
      font-size: 12px;
      color: #71717a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        ${
            logoUrl
                ? `<img src="${logoUrl}" alt="Maha Creative Photography" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 12px; display: inline-block;" />`
                : ""
        }
        <h1 class="brand-title">Maha Creative Photography</h1>
        <p class="brand-subtitle">Photography & Visual Arts Studio</p>
      </div>

      <div class="content">
        <p class="salutation">Hello ${userName},</p>

        ${introLead ? `<p class="lead-text">${introLead}</p>` : ""}
        <p class="lead-text">${introMessage}</p>

        <div class="status-badge-container">
          <span class="status-badge">${statusBadgeText}</span>
        </div>

        <div class="card-details">
          <h2 class="card-title">Booking Details</h2>
          <table class="detail-table">
            <tr>
              <td class="detail-label">Booking ID:</td>
              <td class="detail-value" style="font-family: monospace; font-size: 13px;">${bookingId}</td>
            </tr>
            <tr>
              <td class="detail-label">Service:</td>
              <td class="detail-value">${serviceName}</td>
            </tr>
            <tr>
              <td class="detail-label">Package:</td>
              <td class="detail-value">${packageName}</td>
            </tr>
            <tr>
              <td class="detail-label">Date:</td>
              <td class="detail-value">${formattedDate}</td>
            </tr>
            <tr>
              <td class="detail-label">Time:</td>
              <td class="detail-value">${formattedTime}</td>
            </tr>
            <tr>
              <td class="detail-label">Location:</td>
              <td class="detail-value">${location}</td>
            </tr>
            <tr>
              <td class="detail-label">Amount:</td>
              <td class="detail-value highlight">${formattedAmount}</td>
            </tr>
            <tr>
              <td class="detail-label">Status:</td>
              <td class="detail-value" style="color: ${statusColor};">${normalizedStatus}</td>
            </tr>
            ${
                cancellationReason
                    ? `
            <tr>
              <td class="detail-label">Cancellation Reason:</td>
              <td class="detail-value" style="color: #ef4444;">${cancellationReason}</td>
            </tr>
            `
                    : ""
            }
          </table>
        </div>

        <p class="closing">${closingMessage}</p>

        <div class="btn-container">
          <a href="${myBookingsUrl}" class="btn-action" target="_blank" rel="noopener noreferrer">
            View My Bookings
          </a>
        </div>

        <p class="closing" style="margin-top: 25px;">
          Thank you,<br>
          <strong style="color: #ffffff;">Maha Creative Photography</strong>
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Maha Creative Photography. All rights reserved.</p>
        <p style="margin-top: 6px;">Thank you for choosing us &bull; Capturing moments that last forever.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Builds plain-text email strictly adhering to the requested format
 */
const buildBookingEmailText = ({ booking, status, cancellationReason = "" }) => {
    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();
    const formattedDate = formatEventDate(booking.eventDate);
    const formattedTime = formatEventTime(booking.eventDate);
    const formattedAmount = `₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}`;
    const bookingId = booking._id ? booking._id.toString() : "N/A";
    const userName = booking.name || "Valued Client";
    const serviceName = booking.eventType || "Photography Session";
    const packageName = booking.packageName || "Standard Photography Package";
    const location = booking.location || "To be specified";

    if (normalizedStatus === "PENDING") {
        return `Hello ${userName},

Thank you for choosing Maha Creative Photography.

Your booking request has been successfully received and is currently pending confirmation.

Booking Details:

Booking ID: ${bookingId}
Service: ${serviceName}
Package: ${packageName}
Date: ${formattedDate}
Time: ${formattedTime}
Location: ${location}
Amount: ${formattedAmount}
Status: PENDING

Our team will review your booking and update the status soon.

Thank you,
Maha Creative Photography`;
    }

    if (normalizedStatus === "CONFIRMED") {
        return `Hello ${userName},

Great news!

Your booking with Maha Creative Photography has been confirmed.

Booking Details:

Booking ID: ${bookingId}
Service: ${serviceName}
Package: ${packageName}
Date: ${formattedDate}
Time: ${formattedTime}
Location: ${location}
Amount: ${formattedAmount}
Status: CONFIRMED

We look forward to capturing your special moments.

Thank you,
Maha Creative Photography`;
    }

    if (normalizedStatus === "CANCELLED") {
        const reasonLine = cancellationReason
            ? `\nCancellation Reason: ${cancellationReason}`
            : "";

        return `Hello ${userName},

We are sorry to inform you that your booking with Maha Creative Photography has been cancelled.

Booking Details:

Booking ID: ${bookingId}
Service: ${serviceName}
Package: ${packageName}
Date: ${formattedDate}
Time: ${formattedTime}
Location: ${location}
Amount: ${formattedAmount}
Status: CANCELLED${reasonLine}

If you have any questions, please contact our team.

Thank you,
Maha Creative Photography`;
    }

    return `Hello ${userName},

Your booking status with Maha Creative Photography has been updated to ${normalizedStatus}.

Booking ID: ${bookingId}
Status: ${normalizedStatus}

Thank you,
Maha Creative Photography`;
};

/**
 * Core function to send booking status email with safe error fallback
 */
const sendBookingStatusEmail = async ({
    booking,
    status,
    cancellationReason = "",
}) => {
    if (!booking || !booking.email) {
        console.warn(
            "[BOOKING EMAIL WARNING] Missing booking or recipient email. Cannot send email."
        );
        return { success: false, message: "Missing recipient email" };
    }

    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();
    const transporter = createTransporter();

    let subject = "";
    if (normalizedStatus === "PENDING") {
        subject = "Booking Request Received - Maha Creative Photography";
    } else if (normalizedStatus === "CONFIRMED") {
        subject = "Booking Confirmed - Maha Creative Photography";
    } else if (normalizedStatus === "CANCELLED") {
        subject = "Booking Cancelled - Maha Creative Photography";
    } else {
        subject = `Booking ${normalizedStatus} - Maha Creative Photography`;
    }

    const textContent = buildBookingEmailText({
        booking,
        status: normalizedStatus,
        cancellationReason,
    });

    const htmlContent = buildBookingEmailHtml({
        booking,
        status: normalizedStatus,
        cancellationReason,
    });

    // Fallback if SMTP credentials are not yet set
    if (!transporter) {
        console.log("\n=======================================================");
        console.log(" [BOOKING EMAIL NOTICE: SMTP Credentials Not Configured]");
        console.log(` To: ${booking.email} (${booking.name || "Client"})`);
        console.log(` Status: ${normalizedStatus}`);
        console.log(` Subject: ${subject}`);
        console.log(` Booking ID: ${booking._id || "N/A"}`);
        console.log(` Service: ${booking.eventType || "N/A"}`);
        console.log(` Package: ${booking.packageName || "N/A"}`);
        console.log(` Amount: ₹${booking.packagePrice || 0}`);
        console.log(" Configure EMAIL_USER & EMAIL_PASSWORD in .env for real delivery.");
        console.log("=======================================================\n");
        return {
            success: true,
            devMode: true,
        };
    }

    const fromAddress =
        process.env.EMAIL_FROM ||
        `"Maha Creative Photography" <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({
        from: fromAddress,
        to: booking.email,
        subject,
        text: textContent,
        html: htmlContent,
    });

    return {
        success: true,
        messageId: info.messageId,
    };
};

/**
 * Reusable helper for PENDING booking emails
 */
const sendBookingPendingEmail = async (booking) => {
    return sendBookingStatusEmail({
        booking,
        status: "PENDING",
    });
};

/**
 * Reusable helper for CONFIRMED booking emails
 */
const sendBookingConfirmedEmail = async (booking) => {
    return sendBookingStatusEmail({
        booking,
        status: "CONFIRMED",
    });
};

/**
 * Reusable helper for CANCELLED booking emails
 */
const sendBookingCancelledEmail = async (booking, cancellationReason = "") => {
    return sendBookingStatusEmail({
        booking,
        status: "CANCELLED",
        cancellationReason,
    });
};

module.exports = {
    sendPasswordResetEmail,
    sendBookingStatusEmail,
    sendBookingPendingEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
};
