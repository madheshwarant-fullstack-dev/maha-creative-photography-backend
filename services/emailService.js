const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const nodemailer = require("nodemailer");

let cachedTransporter = null;
let lastTransporterConfigKey = "";

/**
 * Strips enclosing whitespace and matching surrounding quotes from environment values.
 */
const cleanEnv = (val) => {
    if (!val) return "";
    let str = val.toString().trim();
    if (
        (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
        (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
    ) {
        str = str.slice(1, -1).trim();
    }
    return str;
};

/**
 * Returns the admin recipient email configured in environment.
 */
const getAdminEmail = () => {
    return (
        cleanEnv(process.env.ADMIN_EMAIL) ||
        cleanEnv(process.env.EMAIL_USER) ||
        cleanEnv(process.env.SMTP_USER) ||
        ""
    );
};

/**
 * Returns formatted sender "From" address.
 * Ensures that when sending via personal Gmail SMTP (@gmail.com), the sender email matches
 * the authenticated account to guarantee 100% SPF/DKIM alignment and prevent emails being sent to Spam.
 */
const getFromAddress = () => {
    const user = cleanEnv(process.env.EMAIL_USER) || cleanEnv(process.env.SMTP_USER);
    const customFrom = cleanEnv(process.env.EMAIL_FROM);

    if (customFrom) {
        if (user && user.toLowerCase().endsWith("@gmail.com")) {
            const hasForeignDomain = customFrom.includes("@") && !customFrom.toLowerCase().includes(user.toLowerCase());
            if (hasForeignDomain) {
                const brandMatch = customFrom.match(/^([^<]+)/);
                const brandName = (brandMatch ? brandMatch[1].replace(/["']/g, "").trim() : "") || "Maha Creative Photography";
                return `"${brandName}" <${user}>`;
            }
        }
        return customFrom;
    }
    return user ? `"Maha Creative Photography" <${user}>` : '"Maha Creative Photography"';
};

/**
 * Logs safe SMTP configuration information without exposing passwords.
 */
const logEmailConfiguration = () => {
    const user = cleanEnv(process.env.EMAIL_USER) || cleanEnv(process.env.SMTP_USER);
    const host = cleanEnv(process.env.EMAIL_HOST) || cleanEnv(process.env.SMTP_HOST);
    const rawPort = cleanEnv(process.env.EMAIL_PORT) || cleanEnv(process.env.SMTP_PORT);
    const secure = cleanEnv(process.env.EMAIL_SECURE) === "true";
    const hasPassword = !!(
        cleanEnv(process.env.EMAIL_PASSWORD) ||
        cleanEnv(process.env.EMAIL_PASS) ||
        cleanEnv(process.env.SMTP_PASS)
    );
    const adminEmail = getAdminEmail();
    const from = getFromAddress();

    console.log("\n=======================================================");
    console.log(" [EMAIL SERVICE CONFIGURATION]");
    console.log("  EMAIL_USER:", user || "(NOT SET)");
    console.log("  EMAIL_HOST:", host || "smtp.gmail.com (default)");
    console.log("  EMAIL_PORT:", rawPort || (secure ? "465 (SSL)" : "587 (TLS)"));
    console.log("  EMAIL_SECURE:", secure);
    console.log("  EMAIL_PASSWORD configured:", hasPassword);
    console.log("  EMAIL_FROM:", from);
    console.log("  ADMIN_EMAIL:", adminEmail || "(NOT SET)");
    console.log(
        "  SMTP STATUS:",
        user && hasPassword
            ? "Configured (Ready for verification/sending)"
            : "NOT CONFIGURED (EMAIL_USER or EMAIL_PASSWORD missing in .env)"
    );
    console.log("=======================================================\n");
};

/**
 * Initializes and retrieves the Nodemailer transporter instance.
 * Reuses existing singleton instance if configuration has not changed.
 * Returns null if required credentials are not set.
 */
const getTransporter = () => {
    const user = cleanEnv(process.env.EMAIL_USER) || cleanEnv(process.env.SMTP_USER);
    const rawPass = (
        process.env.EMAIL_PASSWORD ||
        process.env.EMAIL_PASS ||
        process.env.SMTP_PASS ||
        ""
    ).toString().replace(/^["']|["']$/g, "").trim();

    // Google App Passwords often contain spaces (e.g. "abcd efgh ijkl mnop"). Strip them.
    const pass = rawPass.replace(/\s+/g, "");

    if (!user || !pass) {
        return null;
    }

    const host = cleanEnv(process.env.EMAIL_HOST) || cleanEnv(process.env.SMTP_HOST);
    const rawPort = cleanEnv(process.env.EMAIL_PORT) || cleanEnv(process.env.SMTP_PORT);
    const parsedPort = rawPort ? parseInt(rawPort, 10) : NaN;
    const secure = cleanEnv(process.env.EMAIL_SECURE) === "true" || parsedPort === 465;
    const port = !isNaN(parsedPort) ? parsedPort : (secure ? 465 : 587);

    const configKey = `${user}:${host || "smtp.gmail.com"}:${port}:${secure}:${pass.length}`;
    if (cachedTransporter && lastTransporterConfigKey === configKey) {
        return cachedTransporter;
    }

    console.log(`[EMAIL SERVICE] Initializing SMTP Transporter (${host || "smtp.gmail.com"}:${port}, secure=${secure}) for user: ${user}`);

    // If custom host is defined or Gmail is configured:
    cachedTransporter = nodemailer.createTransport({
        host: host || "smtp.gmail.com",
        port,
        secure,
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2",
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });

    lastTransporterConfigKey = configKey;
    return cachedTransporter;
};

/**
 * Creates or retrieves transporter for backward compatibility.
 */
const createTransporter = () => getTransporter();

/**
 * Verifies SMTP connection without exposing credentials.
 * Provides clear diagnostic guidance on common SMTP connection and auth failures.
 */
const verifyTransporter = async () => {
    const user = cleanEnv(process.env.EMAIL_USER) || cleanEnv(process.env.SMTP_USER);
    const rawPass = (
        process.env.EMAIL_PASSWORD ||
        process.env.EMAIL_PASS ||
        process.env.SMTP_PASS ||
        ""
    ).toString().replace(/^["']|["']$/g, "").trim();
    const pass = rawPass.replace(/\s+/g, "");

    if (!user || !pass) {
        return {
            configured: false,
            verified: false,
            message:
                "SMTP credentials not configured (EMAIL_USER or EMAIL_PASSWORD missing in backend .env)",
            missing: [
                ...(!user ? ["EMAIL_USER"] : []),
                ...(!pass ? ["EMAIL_PASSWORD"] : []),
            ],
        };
    }

    const transporter = getTransporter();
    if (!transporter) {
        return {
            configured: false,
            verified: false,
            message: "Unable to initialize SMTP transporter instance",
        };
    }

    try {
        console.log(`[EMAIL SERVICE] Verifying SMTP connection to ${cleanEnv(process.env.EMAIL_HOST) || "smtp.gmail.com"}...`);
        await transporter.verify();
        console.log("[EMAIL SERVICE] SMTP connection verified successfully!");
        return {
            configured: true,
            verified: true,
            provider: cleanEnv(process.env.EMAIL_HOST) || "smtp.gmail.com",
            user,
            message: "SMTP connection established and verified successfully",
        };
    } catch (error) {
        console.error("[EMAIL SERVICE] SMTP verification failed:", error.message);

        let diagnosis = "SMTP server rejected connection or authentication.";
        const msg = error.message.toLowerCase();

        if (
            msg.includes("invalid login") ||
            msg.includes("badcredentials") ||
            msg.includes("username and password not accepted") ||
            error.code === "EAUTH"
        ) {
            diagnosis =
                "Authentication failed. If using Gmail, you MUST enable 2-Step Verification and generate a 16-character App Password (at https://myaccount.google.com/apppasswords), instead of your standard Gmail account password.";
        } else if (
            error.code === "ETIMEDOUT" ||
            error.code === "ESOCKETTIMEDOUT" ||
            msg.includes("timeout")
        ) {
            diagnosis =
                "Connection to SMTP server timed out. Check network connectivity, firewall settings, and port configuration (port 587 or 465).";
        } else if (error.code === "ECONNREFUSED") {
            diagnosis =
                "Connection refused by the SMTP server. Check whether EMAIL_HOST and EMAIL_PORT are correct.";
        } else if (error.code === "ENOTFOUND") {
            diagnosis = `Hostname lookup failed for EMAIL_HOST (${cleanEnv(process.env.EMAIL_HOST)}). Please verify the SMTP host address.`;
        }

        return {
            configured: true,
            verified: false,
            error: error.message,
            errorCode: error.code || "SMTP_ERROR",
            diagnosis,
        };
    }
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
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    } catch {
        return String(date);
    }
};

/**
 * Formats time from eventDate.
 * Avoids assuming 05:30 AM when only a calendar date (midnight UTC) was provided.
 */
const formatEventTime = (date) => {
    if (!date) return "Flexible / To be coordinated";
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "Flexible / To be coordinated";
        // If UTC time is 00:00:00, the user selected a date without a specific time
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
            return "Flexible / To be coordinated";
        }
        return d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return "Flexible / To be coordinated";
    }
};

// =========================================================================
// 1. PASSWORD RESET EMAIL TEMPLATES & SENDERS
// =========================================================================

/**
 * Generates responsive luxury HTML template for Password Reset
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
          You requested a password reset. Click the button below to choose a new password.
        </p>

        <div class="btn-container">
          <a href="${resetUrl}" class="btn-reset" target="_blank" rel="noopener noreferrer">
            Reset Password
          </a>
        </div>

        <p class="security-notice" style="color: #f59e0b; font-weight: 500;">
          &#9888; This link will expire after 1 hour.
        </p>

        <div class="link-note">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        </div>

        <div class="divider"></div>

        <p class="security-notice">
          If you did not request this, you can safely ignore this email. Your current password remains active.
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
 * Sends password reset email for client or admin.
 */
const sendPasswordResetEmail = async ({
    to,
    resetUrl,
    role = "user",
    userName = "",
}) => {
    if (!to || !to.trim()) {
        throw new Error("Recipient email address is required");
    }

    const isAdmin = role === "admin";
    const subject = isAdmin
        ? "Maha Creative Photography - Admin Password Reset Request"
        : "Maha Creative Photography - Password Reset Request";

    const textContent = `Maha Creative Photography

You requested a password reset.

Click the link below to create a new password:
${resetUrl}

This link will expire after 1 hour.

If you did not request this, you can safely ignore this email.`;

    const htmlContent = buildPasswordResetEmailHtml({ resetUrl, role, userName });

    const transporter = getTransporter();

    // If SMTP credentials are not configured in environment
    if (!transporter) {
        console.warn("\n=======================================================");
        console.warn(" [EMAIL NOT SENT: SMTP Credentials Not Configured]");
        console.warn(` Target Recipient: ${to}`);
        console.warn(` Subject: ${subject}`);
        console.warn(` Reset URL: ${resetUrl}`);
        console.warn(" Please add EMAIL_USER and EMAIL_PASSWORD to backend/.env.");
        console.warn("=======================================================\n");
        return {
            success: false,
            configured: false,
            error: "SMTP credentials not configured in backend environment",
            resetUrl,
        };
    }

    const fromAddress = getFromAddress();

    try {
        console.log(`[EMAIL SERVICE] Sending password reset email to: ${to}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Password reset email delivered to ${to} (MessageId: ${info.messageId})`);
        return {
            success: true,
            configured: true,
            messageId: info.messageId,
            resetUrl,
        };
    } catch (sendError) {
        console.error(`[EMAIL SERVICE ERROR] Failed to send password reset email to ${to}:`, sendError.message);
        return {
            success: false,
            configured: true,
            error: sendError.message,
            resetUrl,
        };
    }
};

// =========================================================================
// 2. CLIENT BOOKING STATUS EMAIL TEMPLATES & SENDERS
// =========================================================================

/**
 * Builds responsive luxury HTML email for booking status transitions (Pending, Confirmed, Cancelled)
 */
const buildBookingEmailHtml = ({
    booking,
    status,
    cancellationReason = "",
    recipientEmail = "",
}) => {
    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();
    const formattedDate = formatEventDate(booking.eventDate);
    const formattedTime = formatEventTime(booking.eventDate);
    const formattedAmount = `₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}`;
    const bookingId = booking._id ? booking._id.toString() : "N/A";
    const userName = booking.name || "Valued Client";
    const customerEmail = recipientEmail || booking.email || "N/A";
    const customerPhone = booking.phone || "";
    const serviceName = booking.eventType || "Photography Session";
    const packageName = booking.packageName || "Standard Photography Package";
    const location = booking.location || "To be specified";

    const frontendUrl = (
        cleanEnv(process.env.FRONTEND_URL) ||
        cleanEnv(process.env.CLIENT_URL) ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const myBookingsUrl = `${frontendUrl}/my-bookings`;
    const logoUrl = cleanEnv(process.env.EMAIL_LOGO_URL) || `${frontendUrl}/images/Logo.png`;

    let statusColor = "#f59e0b";
    let statusBg = "#2e220a";
    let statusBorder = "#78350f";
    let statusBadgeText = "PENDING APPROVAL";
    let introLead = "Thank you for choosing Maha Creative Photography.";
    let introMessage = "Your booking request has been successfully received and confirmed in our system. Our team is currently reviewing the scheduling details.";
    let closingMessage = "Our photography studio will finalize the schedule and update your confirmation status shortly.";

    if (normalizedStatus === "CONFIRMED") {
        statusColor = "#10b981";
        statusBg = "#06281e";
        statusBorder = "#047857";
        statusBadgeText = "BOOKING CONFIRMED";
        introLead = "Great news!";
        introMessage = "Your photography booking with Maha Creative Photography has been officially confirmed!";
        closingMessage = "We look forward to capturing your memorable moments. Feel free to reply directly to this email if you need any adjustments.";
    } else if (normalizedStatus === "CANCELLED") {
        statusColor = "#ef4444";
        statusBg = "#2d0e0e";
        statusBorder = "#991b1b";
        statusBadgeText = "BOOKING CANCELLED";
        introLead = "";
        introMessage = "We are sorry to inform you that your booking with Maha Creative Photography has been cancelled.";
        closingMessage = "If you have any questions or would like to discuss alternative dates, please contact our team.";
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
              <td class="detail-label">Customer Name:</td>
              <td class="detail-value">${userName}</td>
            </tr>
            <tr>
              <td class="detail-label">Customer Email:</td>
              <td class="detail-value">${customerEmail}</td>
            </tr>
            ${customerPhone ? `
            <tr>
              <td class="detail-label">Customer Phone:</td>
              <td class="detail-value">${customerPhone}</td>
            </tr>
            ` : ""}
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
            ${cancellationReason ? `
            <tr>
              <td class="detail-label">Cancellation Reason:</td>
              <td class="detail-value" style="color: #ef4444;">${cancellationReason}</td>
            </tr>
            ` : ""}
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
 * Builds plain-text fallback for booking emails
 */
const buildBookingEmailText = ({
    booking,
    status,
    cancellationReason = "",
    recipientEmail = "",
}) => {
    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();
    const formattedDate = formatEventDate(booking.eventDate);
    const formattedTime = formatEventTime(booking.eventDate);
    const formattedAmount = `₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}`;
    const bookingId = booking._id ? booking._id.toString() : "N/A";
    const userName = booking.name || "Valued Client";
    const customerEmail = recipientEmail || booking.email || "N/A";
    const customerPhone = booking.phone || "N/A";
    const serviceName = booking.eventType || "Photography Session";
    const packageName = booking.packageName || "Standard Photography Package";
    const location = booking.location || "To be specified";

    return `Hello ${userName},

Booking Details with Maha Creative Photography:

Booking ID: ${bookingId}
Service: ${serviceName}
Package: ${packageName}
Date: ${formattedDate}
Time: ${formattedTime}
Location: ${location}
Amount: ${formattedAmount}
Status: ${normalizedStatus}
${cancellationReason ? `Cancellation Reason: ${cancellationReason}\n` : ""}
Customer Email: ${customerEmail}
Customer Phone: ${customerPhone}

Thank you,
Maha Creative Photography`;
};

/**
 * Core function to send booking status email to client
 */
const sendBookingStatusEmail = async ({
    booking,
    status,
    recipientEmail = "",
    cancellationReason = "",
}) => {
    if (!booking) {
        throw new Error("Missing booking data for email notification");
    }

    const to = (
        recipientEmail ||
        booking.email ||
        ""
    ).trim();

    if (!to) {
        throw new Error("Recipient email address is missing or empty");
    }

    const normalizedStatus = (status || booking.status || "Pending").toUpperCase();

    let subject = "";
    if (normalizedStatus === "PENDING") {
        subject = "Booking Confirmation: Request Received - Maha Creative Photography";
    } else if (normalizedStatus === "CONFIRMED") {
        subject = "Booking Confirmation: Confirmed - Maha Creative Photography";
    } else if (normalizedStatus === "CANCELLED") {
        subject = "Booking Notice: Cancelled - Maha Creative Photography";
    } else {
        subject = `Booking Confirmation: ${normalizedStatus} - Maha Creative Photography`;
    }

    const textContent = buildBookingEmailText({
        booking,
        status: normalizedStatus,
        cancellationReason,
        recipientEmail: to,
    });

    const htmlContent = buildBookingEmailHtml({
        booking,
        status: normalizedStatus,
        cancellationReason,
        recipientEmail: to,
    });

    const transporter = getTransporter();

    if (!transporter) {
        console.warn("\n=======================================================");
        console.warn(" [BOOKING EMAIL NOT SENT: SMTP Credentials Not Configured]");
        console.warn(` Target Recipient: ${to}`);
        console.warn(` Status: ${normalizedStatus}`);
        console.warn(` Subject: ${subject}`);
        console.warn(" Please add EMAIL_USER and EMAIL_PASSWORD to backend/.env.");
        console.warn("=======================================================\n");
        return {
            success: false,
            configured: false,
            error: "SMTP credentials not configured in backend environment",
        };
    }

    const fromAddress = getFromAddress();
    const adminEmail = getAdminEmail();

    try {
        console.log(`[EMAIL SERVICE] Sending booking ${normalizedStatus} email to client: ${to}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            replyTo: adminEmail || undefined,
            subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Booking email delivered to ${to} (MessageId: ${info.messageId})`);
        return {
            success: true,
            configured: true,
            messageId: info.messageId,
        };
    } catch (sendError) {
        console.error(`[EMAIL SERVICE ERROR] Failed to deliver booking email to ${to}:`, sendError.message);
        return {
            success: false,
            configured: true,
            error: sendError.message,
        };
    }
};

// Generic & Status-specific Booking Helpers
const sendBookingEmail = async ({
    to,
    booking,
    status = "PENDING",
    cancellationReason = "",
}) => {
    return sendBookingStatusEmail({
        booking,
        status,
        recipientEmail: to,
        cancellationReason,
    });
};

const sendBookingPendingEmail = async (booking, recipientEmail = "") => {
    return sendBookingStatusEmail({
        booking,
        status: "PENDING",
        recipientEmail,
    });
};

const sendBookingConfirmedEmail = async (booking, recipientEmail = "") => {
    return sendBookingStatusEmail({
        booking,
        status: "CONFIRMED",
        recipientEmail,
    });
};

const sendBookingCancelledEmail = async (
    booking,
    cancellationReason = "",
    recipientEmail = ""
) => {
    return sendBookingStatusEmail({
        booking,
        status: "CANCELLED",
        cancellationReason,
        recipientEmail,
    });
};

const sendBookingConfirmationEmail = async (booking, recipientEmail = "") => {
    return sendBookingConfirmedEmail(booking, recipientEmail);
};

// =========================================================================
// 3. ADMIN BOOKING NOTIFICATION EMAIL
// =========================================================================

/**
 * Builds luxury HTML email for Admin Booking Notification
 */
const buildAdminBookingEmailHtml = ({ booking, type = "NEW_BOOKING", cancellationReason = "" }) => {
    const formattedDate = formatEventDate(booking.eventDate);
    const formattedTime = formatEventTime(booking.eventDate);
    const formattedAmount = `₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}`;
    const bookingId = booking._id ? booking._id.toString() : "N/A";
    const userName = booking.name || "Client";
    const customerEmail = booking.email || "N/A";
    const customerPhone = booking.phone || "N/A";
    const serviceName = booking.eventType || "Photography Session";
    const packageName = booking.packageName || "N/A";
    const location = booking.location || "N/A";
    const message = booking.message || "";

    const frontendUrl = (
        cleanEnv(process.env.FRONTEND_URL) ||
        cleanEnv(process.env.CLIENT_URL) ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const adminBookingsUrl = `${frontendUrl}/admin/bookings`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Booking Notification - Admin</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f11; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e5e7eb; }
    .wrapper { width: 100%; padding: 40px 15px; background-color: #0f0f11; }
    .container { max-width: 620px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #18181b, #222226); padding: 30px; text-align: center; border-bottom: 2px solid #ff1493; }
    .brand-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
    .badge { display: inline-block; background-color: #ff1493; color: #ffffff; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 32px 30px; }
    .card-details { background-color: #202025; border: 1px solid #2e2e33; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table td { padding: 8px 0; font-size: 14px; }
    .detail-label { color: #9ca3af; width: 38%; }
    .detail-value { color: #ffffff; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background: #ff1493; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 6px; }
    .footer { background-color: #121215; padding: 20px; text-align: center; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Maha Creative Photography</h1>
        <span class="badge">ADMIN NOTIFICATION: ${type}</span>
      </div>
      <div class="content">
        <p style="font-size: 16px; margin-top: 0;">${
            type.includes("CONFIRMED")
                ? "A client photography booking has been officially confirmed."
                : type.includes("CANCELLED")
                ? "A client photography booking has been cancelled."
                : "A client has submitted a photography booking request on the website."
        }</p>
        
        <div class="card-details">
          <table class="detail-table">
            <tr><td class="detail-label">Booking ID:</td><td class="detail-value" style="font-family: monospace;">${bookingId}</td></tr>
            <tr><td class="detail-label">Customer Name:</td><td class="detail-value">${userName}</td></tr>
            <tr><td class="detail-label">Customer Email:</td><td class="detail-value">${customerEmail}</td></tr>
            <tr><td class="detail-label">Customer Phone:</td><td class="detail-value">${customerPhone}</td></tr>
            <tr><td class="detail-label">Event Type:</td><td class="detail-value">${serviceName}</td></tr>
            <tr><td class="detail-label">Package:</td><td class="detail-value">${packageName}</td></tr>
            <tr><td class="detail-label">Event Date:</td><td class="detail-value">${formattedDate}</td></tr>
            <tr><td class="detail-label">Event Time:</td><td class="detail-value">${formattedTime}</td></tr>
            <tr><td class="detail-label">Location:</td><td class="detail-value">${location}</td></tr>
            <tr><td class="detail-label">Package Amount:</td><td class="detail-value" style="color: #ff1493;">${formattedAmount}</td></tr>
            <tr><td class="detail-label">Status:</td><td class="detail-value" style="color: #f59e0b;">${booking.status || "Pending"}</td></tr>
            ${message ? `<tr><td class="detail-label">Client Notes:</td><td class="detail-value" style="text-align: left; padding-top: 10px;" colspan="2">${message}</td></tr>` : ""}
            ${cancellationReason ? `<tr><td class="detail-label">Cancellation Reason:</td><td class="detail-value" style="color: #ef4444;">${cancellationReason}</td></tr>` : ""}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${adminBookingsUrl}" class="btn" target="_blank">Open Admin Bookings Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Maha Creative Photography Management Portal</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Sends notification email to administrator when a new booking is placed or updated
 */
const sendAdminBookingNotification = async ({
    booking,
    type = "NEW_BOOKING",
    cancellationReason = "",
}) => {
    if (!booking) {
        throw new Error("Missing booking data for admin notification");
    }

    const adminEmail = getAdminEmail();
    if (!adminEmail) {
        console.warn("[EMAIL SERVICE] No ADMIN_EMAIL or EMAIL_USER defined to receive admin booking notifications.");
        return {
            success: false,
            configured: false,
            error: "No admin email configured",
        };
    }

    let subjectTag = "[NEW BOOKING]";
    if (type.includes("CONFIRMED")) {
        subjectTag = "[BOOKING CONFIRMED]";
    } else if (type.includes("CANCELLED")) {
        subjectTag = "[BOOKING CANCELLED]";
    }

    const subject = `${subjectTag} ${booking.eventType || "Photo Session"} - ${booking.name || "Client"}`;
    const htmlContent = buildAdminBookingEmailHtml({ booking, type, cancellationReason });
    const textContent = `Admin Notification: ${type}
ID: ${booking._id || "N/A"}
Customer: ${booking.name || "Client"} (${booking.email || "N/A"}, ${booking.phone || "N/A"})
Event: ${booking.eventType || "N/A"}
Package: ${booking.packageName || "N/A"}
Date: ${formatEventDate(booking.eventDate)}
Time: ${formatEventTime(booking.eventDate)}
Location: ${booking.location || "N/A"}
Amount: ₹${Number(booking.packagePrice || 0).toLocaleString("en-IN")}
Status: ${booking.status || "Pending"}`;

    const transporter = getTransporter();
    if (!transporter) {
        console.warn("[EMAIL SERVICE] SMTP not configured; admin booking notification skipped.");
        return {
            success: false,
            configured: false,
            error: "SMTP credentials not configured",
        };
    }

    const fromAddress = getFromAddress();

    try {
        console.log(`[EMAIL SERVICE] Sending admin booking notification (${type}) to: ${adminEmail}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to: adminEmail,
            replyTo: booking.email || undefined,
            subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Admin booking notification delivered (MessageId: ${info.messageId})`);
        return {
            success: true,
            configured: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("[EMAIL SERVICE ERROR] Failed to send admin booking notification:", error.message);
        return {
            success: false,
            configured: true,
            error: error.message,
        };
    }
};

// =========================================================================
// 4. CONTACT / MESSAGE NOTIFICATION & ACKNOWLEDGEMENT EMAILS
// =========================================================================

/**
 * Sends contact notification email to administrator when a user submits contact form
 */
const sendContactNotification = async ({
    name,
    email,
    phone = "",
    subject = "",
    message,
}) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
        console.warn("[EMAIL SERVICE] No ADMIN_EMAIL or EMAIL_USER defined to receive contact messages.");
        return {
            success: false,
            configured: false,
            error: "No admin email configured",
        };
    }

    const emailSubject = `[NEW INQUIRY] ${subject || "Contact Form"} - ${name}`;
    const frontendUrl = (
        cleanEnv(process.env.FRONTEND_URL) ||
        cleanEnv(process.env.CLIENT_URL) ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const adminMessagesUrl = `${frontendUrl}/admin/messages`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Website Inquiry</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f11; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e5e7eb; }
    .wrapper { width: 100%; padding: 40px 15px; background-color: #0f0f11; }
    .container { max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #111, #1a1a1e); padding: 25px 30px; text-align: center; border-bottom: 2px solid #ff1493; }
    .content { padding: 30px; }
    .msg-box { background: #202025; border-left: 3px solid #ff1493; padding: 16px 20px; border-radius: 6px; margin: 20px 0; white-space: pre-line; color: #e5e7eb; }
    .footer { background: #121215; padding: 18px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Maha Creative Photography</h2>
        <p style="color: #ff1493; margin: 4px 0 0 0; font-size: 12px; letter-spacing: 2px;">NEW WEBSITE INQUIRY</p>
      </div>
      <div class="content">
        <p style="margin-top: 0;">You have received a new customer inquiry via the website contact form:</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #ff1493;">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Subject:</strong> ${subject || "General Inquiry"}</p>
        
        <p style="margin-top: 20px; margin-bottom: 6px;"><strong>Message:</strong></p>
        <div class="msg-box">${message}</div>

        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${adminMessagesUrl}" style="background: #ff1493; color: #fff; padding: 11px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View in Admin Portal
          </a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Maha Creative Photography Management Portal</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const textContent = `New Contact Form Inquiry:
From: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
Subject: ${subject || "General Inquiry"}

Message:
${message}`;

    const transporter = getTransporter();
    if (!transporter) {
        console.warn("[EMAIL SERVICE] SMTP not configured; contact notification to admin skipped.");
        return {
            success: false,
            configured: false,
            error: "SMTP credentials not configured",
        };
    }

    const fromAddress = getFromAddress();

    try {
        console.log(`[EMAIL SERVICE] Sending contact notification to admin: ${adminEmail}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to: adminEmail,
            replyTo: email,
            subject: emailSubject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Contact notification sent to admin (MessageId: ${info.messageId})`);
        return {
            success: true,
            configured: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("[EMAIL SERVICE ERROR] Failed to send contact notification:", error.message);
        return {
            success: false,
            configured: true,
            error: error.message,
        };
    }
};

/**
 * Sends a polite acknowledgment email to the user confirming receipt of their contact message
 */
const sendContactAcknowledgement = async ({
    name,
    email,
    subject = "",
    message = "",
}) => {
    if (!email || !email.trim()) {
        return { success: false, error: "No client email provided" };
    }

    const emailSubject = "Thank You for Contacting Maha Creative Photography";
    const transporter = getTransporter();

    if (!transporter) {
        return {
            success: false,
            configured: false,
            error: "SMTP credentials not configured",
        };
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Thank You for Contacting Us</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f11; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e5e7eb; }
    .wrapper { width: 100%; padding: 40px 15px; background-color: #0f0f11; }
    .container { max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #111, #1a1a1e); padding: 30px; text-align: center; border-bottom: 2px solid #ff1493; }
    .content { padding: 30px; }
    .footer { background: #121215; padding: 20px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Maha Creative Photography</h2>
        <p style="color: #ff1493; margin: 6px 0 0 0; font-size: 12px; letter-spacing: 2px;">PHOTOGRAPHY & VISUAL ARTS STUDIO</p>
      </div>
      <div class="content">
        <p style="font-size: 16px; margin-top: 0;">Hello ${name},</p>
        <p style="color: #d1d5db; line-height: 1.6;">
          Thank you for reaching out to Maha Creative Photography! We have received your inquiry${subject ? ` regarding "<strong>${subject}</strong>"` : ""}.
        </p>
        <p style="color: #d1d5db; line-height: 1.6;">
          Our photography team will review your message and get in touch with you shortly.
        </p>
        <div style="background: #202025; padding: 15px 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #2e2e33;">
          <p style="margin: 0; color: #9ca3af; font-size: 13px;">Direct Studio Contact:</p>
          <p style="margin: 4px 0 0 0; color: #ffffff; font-weight: 600;">+91 97901 02798</p>
        </div>
        <p style="margin-top: 25px; color: #9ca3af; font-size: 14px;">
          Warm regards,<br>
          <strong style="color: #ffffff;">Maha Creative Photography Team</strong>
        </p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Maha Creative Photography. All rights reserved.</p>
        <p style="margin-top: 4px;">Capturing moments that last forever.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    const textContent = `Hello ${name},

Thank you for reaching out to Maha Creative Photography!

We have received your message${subject ? ` regarding "${subject}"` : ""} and our team will get in touch with you shortly.

Studio Contact: +91 97901 02798

Warm regards,
Maha Creative Photography Team`;

    const fromAddress = getFromAddress();

    try {
        console.log(`[EMAIL SERVICE] Sending inquiry acknowledgement to customer: ${email}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: emailSubject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Customer acknowledgement delivered (MessageId: ${info.messageId})`);
        return {
            success: true,
            configured: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("[EMAIL SERVICE ERROR] Failed to send customer acknowledgement:", error.message);
        return {
            success: false,
            configured: true,
            error: error.message,
        };
    }
};

/**
 * Sends a welcome email to newly registered users
 */
const sendWelcomeEmail = async ({ to, userName = "" }) => {
    if (!to || !to.trim()) {
        throw new Error("Recipient email address is required");
    }

    const frontendUrl = (
        cleanEnv(process.env.FRONTEND_URL) ||
        cleanEnv(process.env.CLIENT_URL) ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const exploreUrl = `${frontendUrl}/packages`;
    const subject = "Welcome to Maha Creative Photography!";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to Maha Creative Photography</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f0f11; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e5e7eb; }
    .wrapper { width: 100%; padding: 40px 15px; background-color: #0f0f11; }
    .container { max-width: 580px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #111111, #1a1a1e); padding: 35px 30px; text-align: center; border-bottom: 2px solid #ff1493; }
    .brand-title { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 0 0 6px 0; text-transform: uppercase; }
    .brand-subtitle { color: #ff1493; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-weight: 600; }
    .content { padding: 35px 30px; }
    .btn { display: inline-block; background: #ff1493; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 30px; border-radius: 6px; box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4); }
    .footer { background-color: #121215; padding: 22px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">Maha Creative Photography</h1>
        <p class="brand-subtitle">Photography & Visual Arts Studio</p>
      </div>
      <div class="content">
        <p style="font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 0;">Welcome, ${userName || "Valued Client"}!</p>
        <p style="color: #d1d5db; line-height: 1.6;">
          Thank you for joining <strong>Maha Creative Photography</strong>. Your client account has been successfully created.
        </p>
        <p style="color: #d1d5db; line-height: 1.6;">
          You can now explore our photography packages, book customized sessions for weddings, engagements, events and portraits, and track your bookings in real time.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${exploreUrl}" class="btn" target="_blank">Explore Photography Packages</a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; margin-top: 25px;">
          Need a custom photoshoot or have questions? Call us directly at <strong style="color: #ffffff;">+91 97901 02798</strong>.
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

    const textContent = `Hello ${userName || "Valued Client"},

Welcome to Maha Creative Photography!

Your client account has been successfully created. You can now explore photography packages and book sessions.

Explore Packages: ${exploreUrl}
Studio Contact: +91 97901 02798

Thank you,
Maha Creative Photography Team`;

    const transporter = getTransporter();
    if (!transporter) {
        return { success: false, configured: false, error: "SMTP credentials not configured" };
    }

    const fromAddress = getFromAddress();

    try {
        console.log(`[EMAIL SERVICE] Sending welcome email to: ${to}`);
        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text: textContent,
            html: htmlContent,
        });

        console.log(`[EMAIL SERVICE] Welcome email delivered to ${to} (MessageId: ${info.messageId})`);
        return { success: true, configured: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[EMAIL SERVICE ERROR] Failed to send welcome email to ${to}:`, err.message);
        return { success: false, configured: true, error: err.message };
    }
};

module.exports = {
    getTransporter,
    createTransporter,
    verifyTransporter,
    logEmailConfiguration,
    sendPasswordResetEmail,
    sendBookingEmail,
    sendBookingStatusEmail,
    sendBookingPendingEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
    sendBookingConfirmationEmail,
    sendAdminBookingNotification,
    sendContactNotification,
    sendContactAcknowledgement,
    sendWelcomeEmail,
};
