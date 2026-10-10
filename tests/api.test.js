const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Ensure NODE_ENV is set to test so server does not call app.listen automatically
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-super-secret-jwt-key";

// Stub emailService to prevent sending real emails and speed up tests
const emailService = require("../services/emailService");
emailService.sendWelcomeEmail = async () => ({ success: true });
emailService.sendPasswordResetEmail = async () => ({ success: true });
emailService.sendBookingPendingEmail = async () => ({ success: true });
emailService.sendBookingConfirmedEmail = async () => ({ success: true });
emailService.sendBookingCancelledEmail = async () => ({ success: true });
emailService.sendAdminBookingNotification = async () => ({ success: true });
emailService.sendContactNotification = async () => ({ success: true });
emailService.sendContactAcknowledgement = async () => ({ success: true });
emailService.verifyTransporter = async () => ({ verified: true, configured: true, provider: "mock-smtp" });

const app = require("../server");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Gallery = require("../models/Gallery");
const Package = require("../models/Package");
const Message = require("../models/Message");

describe("Maha Creative Photography - Comprehensive End-to-End API Audit Suite", () => {
    let clientToken = "";
    let adminToken = "";
    let testUserId = "";
    let testAdminId = "";
    let testBookingId = "";
    let testMessageId = "";
    const uniqueSuffix = Date.now();
    const testClientEmail = `client_${uniqueSuffix}@audit-test.com`;
    const testAdminEmail = `admin_${uniqueSuffix}@audit-test.com`;

    before(async () => {
        // Connect to MongoDB Atlas
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
        }

        // Create test client user
        const clientUser = await User.create({
            name: "Audit Test Client",
            email: testClientEmail,
            phone: "9876543210",
            password: "hashed_dummy_password",
            role: "user",
        });
        testUserId = clientUser._id.toString();

        clientToken = jwt.sign(
            { id: testUserId, role: "user" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Create test admin user
        const adminUser = await User.create({
            name: "Audit Test Admin",
            email: testAdminEmail,
            phone: "9876543211",
            password: "hashed_dummy_password",
            role: "admin",
        });
        testAdminId = adminUser._id.toString();

        adminToken = jwt.sign(
            { id: testAdminId, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    after(async () => {
        // Safe cleanup of only test-created records
        if (testUserId) await User.findByIdAndDelete(testUserId);
        if (testAdminId) await User.findByIdAndDelete(testAdminId);
        if (testBookingId) await Booking.findByIdAndDelete(testBookingId);
        if (testMessageId) await Message.findByIdAndDelete(testMessageId);
        await User.deleteMany({ email: { $regex: /@audit-test\.com$/ } });
        await mongoose.connection.close();
    });

    // ================= 1. HEALTH CHECKS & DIAGNOSTICS =================
    describe("1. Health Checks & Server Diagnostics", () => {
        test("GET / - returns 200 with service welcome message", async () => {
            const res = await request(app).get("/");
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.match(res.body.message, /Maha Creative Photography Backend is running/);
        });

        test("GET /api/health - returns 200 with healthy status and uptime", async () => {
            const res = await request(app).get("/api/health");
            assert.equal(res.status, 200);
            assert.equal(res.body.status, "healthy");
            assert.ok(typeof res.body.uptime === "number");
        });

        test("GET /api/health/email - returns diagnostic SMTP response", async () => {
            const res = await request(app).get("/api/health/email");
            assert.ok([200, 502, 503].includes(res.status));
            assert.ok(res.body.smtp !== undefined);
        });

        test("GET /api/nonexistent-route - returns centralized 404 handler response", async () => {
            const res = await request(app).get("/api/nonexistent-route");
            assert.equal(res.status, 404);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /Endpoint .* not found/);
        });
    });

    // ================= 2. SECURITY HEADERS & DEFENSES =================
    describe("2. Security Headers & Defense Mechanisms", () => {
        test("Helmet headers are properly set on responses", async () => {
            const res = await request(app).get("/api/health");
            assert.equal(res.headers["x-content-type-options"], "nosniff");
            assert.equal(res.headers["origin-agent-cluster"], "?1");
            assert.equal(res.headers["x-powered-by"], undefined);
        });

        test("NoSQL query sanitization strips keys starting with $ from request body", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    $where: "1 == 1",
                    email: { $gt: "" },
                    password: "password123",
                });
            // Sanitizer strips $where and object $gt, resulting in missing/invalid string email
            assert.ok([400, 401].includes(res.status));
            assert.equal(res.body.success, false);
        });
    });

    // ================= 3. AUTHENTICATION & PROFILE =================
    describe("3. Authentication & Profile Management", () => {
        test("POST /api/auth/register - rejects registration with missing fields", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name: "Incomplete User",
                email: "incomplete@example.com",
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });

        test("POST /api/auth/register - rejects password shorter than 6 characters", async () => {
            const res = await request(app).post("/api/auth/register").send({
                name: "Short Pass User",
                email: `shortpass_${uniqueSuffix}@audit-test.com`,
                phone: "1234567890",
                password: "123",
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /at least 6 characters/i);
        });

        test("POST /api/auth/login - rejects login with incorrect credentials", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: testClientEmail,
                password: "WrongPassword_1234!",
            });
            assert.equal(res.status, 401);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /Invalid email or password/i);
        });

        test("POST /api/auth/login - rejects non-string credentials payload", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: ["unexpected", "array"],
                password: 12345,
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });

        test("GET /api/auth/profile - allows authenticated client to retrieve their profile", async () => {
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", `Bearer ${clientToken}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.user.email, testClientEmail);
            assert.equal(res.body.user.password, undefined);
        });

        test("GET /api/auth/profile - rejects unauthenticated requests with 401", async () => {
            const res = await request(app).get("/api/auth/profile");
            assert.equal(res.status, 401);
            assert.equal(res.body.success, false);
        });

        test("GET /api/auth/profile - rejects malformed or tampered token with 401", async () => {
            const res = await request(app)
                .get("/api/auth/profile")
                .set("Authorization", "Bearer invalid.fake.token");
            assert.equal(res.status, 401);
            assert.equal(res.body.success, false);
        });

        test("PUT /api/auth/profile - updates user profile name and phone", async () => {
            const res = await request(app)
                .put("/api/auth/profile")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "Audit Test Client Updated",
                    phone: "9998887776",
                });
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.user.name, "Audit Test Client Updated");
            assert.equal(res.body.user.phone, "9998887776");
        });

        test("PUT /api/auth/profile - rejects profile update with empty fields", async () => {
            const res = await request(app)
                .put("/api/auth/profile")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "",
                    phone: "",
                });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });
    });

    // ================= 4. ROLE-BASED ACCESS CONTROL (RBAC) =================
    describe("4. Role-Based Access Control Enforcement", () => {
        test("GET /api/auth/users - blocks standard client user with 403 Forbidden", async () => {
            const res = await request(app)
                .get("/api/auth/users")
                .set("Authorization", `Bearer ${clientToken}`);
            assert.equal(res.status, 403);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /Admin access required/i);
        });

        test("GET /api/auth/users - grants admin access with 200 OK", async () => {
            const res = await request(app)
                .get("/api/auth/users")
                .set("Authorization", `Bearer ${adminToken}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.users));
        });

        test("DELETE /api/auth/users/:id - rejects invalid ObjectId format with 400 Bad Request", async () => {
            const res = await request(app)
                .delete("/api/auth/users/invalid-id-format")
                .set("Authorization", `Bearer ${adminToken}`);
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /Invalid ID format/i);
        });
    });

    // ================= 5. GALLERY API =================
    describe("5. Gallery Endpoints & Protection", () => {
        test("GET /api/gallery - public access succeeds and returns gallery array", async () => {
            const res = await request(app).get("/api/gallery");
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.gallery));
        });

        test("POST /api/gallery - blocks unauthorized public user with 401", async () => {
            const res = await request(app).post("/api/gallery").send({
                title: "Unauthorized Photo",
                category: "Wedding",
            });
            assert.equal(res.status, 401);
        });

        test("POST /api/gallery - blocks non-admin client with 403 Forbidden", async () => {
            const res = await request(app)
                .post("/api/gallery")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    title: "Client Upload Attempt",
                    category: "Wedding",
                });
            assert.equal(res.status, 403);
        });

        test("PUT /api/gallery/:id - rejects malformed ObjectId with 400", async () => {
            const res = await request(app)
                .put("/api/gallery/invalid-mongodb-id")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ title: "Updated Title" });
            assert.equal(res.status, 400);
            assert.match(res.body.message, /Invalid ID format/i);
        });
    });

    // ================= 6. PACKAGES API =================
    describe("6. Packages Endpoints & Access Control", () => {
        test("GET /api/packages - public access returns package catalog", async () => {
            const res = await request(app).get("/api/packages");
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.packages));
        });

        test("GET /api/packages/:packageId - returns 404 for nonexistent package", async () => {
            const res = await request(app).get("/api/packages/nonexistent-package-id-9999");
            assert.equal(res.status, 404);
            assert.equal(res.body.success, false);
        });

        test("POST /api/packages - blocks non-admin client with 403", async () => {
            const res = await request(app)
                .post("/api/packages")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    packageId: "test-pkg",
                    name: "Unauthorized Package",
                    category: "Wedding",
                    delivery: "10 days",
                    price: 5000,
                });
            assert.equal(res.status, 403);
        });
    });

    // ================= 7. BOOKINGS API =================
    describe("7. Bookings Workflow & Ownership", () => {
        test("POST /api/bookings - rejects unauthenticated booking creation with 401", async () => {
            const res = await request(app).post("/api/bookings").send({
                name: "Unauthenticated Guest",
                email: "guest@example.com",
                phone: "1234567890",
                eventType: "Wedding",
                eventDate: new Date(),
                location: "Chennai",
            });
            assert.equal(res.status, 401);
        });

        test("POST /api/bookings - rejects booking with missing required fields", async () => {
            const res = await request(app)
                .post("/api/bookings")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "Incomplete Booking",
                });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });

        test("POST /api/bookings - creates booking for authenticated client", async () => {
            const res = await request(app)
                .post("/api/bookings")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "Audit Test Client",
                    email: testClientEmail,
                    phone: "9876543210",
                    eventType: "Wedding",
                    eventDate: new Date(Date.now() + 86400000 * 30),
                    location: "Chennai Studio",
                    message: "E2E Automated test booking",
                    packageId: "wedding-gold",
                    packageName: "Wedding Gold Package",
                    packagePrice: 35000,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.success, true);
            assert.equal(res.body.booking.status, "Pending");
            assert.equal(res.body.booking.packagePrice, 35000);
            testBookingId = res.body.booking._id;
        });

        test("GET /api/bookings/my-bookings - returns only the authenticated client's bookings", async () => {
            const res = await request(app)
                .get("/api/bookings/my-bookings")
                .set("Authorization", `Bearer ${clientToken}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.bookings));
            assert.ok(res.body.bookings.some((b) => b._id.toString() === testBookingId));
        });

        test("GET /api/bookings - blocks client user from fetching all studio bookings (403)", async () => {
            const res = await request(app)
                .get("/api/bookings")
                .set("Authorization", `Bearer ${clientToken}`);
            assert.equal(res.status, 403);
        });

        test("GET /api/bookings - allows admin user to fetch all studio bookings (200)", async () => {
            const res = await request(app)
                .get("/api/bookings")
                .set("Authorization", `Bearer ${adminToken}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.bookings));
        });

        test("PUT /api/bookings/:id/status - admin can update booking status to Confirmed", async () => {
            if (!testBookingId) return;
            const res = await request(app)
                .put(`/api/bookings/${testBookingId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "Confirmed" });
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.booking.status, "Confirmed");
        });

        test("PUT /api/bookings/:id/status - rejects invalid status transition", async () => {
            if (!testBookingId) return;
            const res = await request(app)
                .put(`/api/bookings/${testBookingId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "UnknownStatusValue" });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
        });

        test("PUT /api/bookings/:id/status - rejects invalid ObjectId format with 400", async () => {
            const res = await request(app)
                .put("/api/bookings/not-a-valid-id/status")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "Confirmed" });
            assert.equal(res.status, 400);
            assert.match(res.body.message, /Invalid ID format/i);
        });
    });

    // ================= 8. CONTACT MESSAGES API =================
    describe("8. Contact Messages & Inquiries", () => {
        test("POST /api/messages - creates a new customer contact message", async () => {
            const res = await request(app).post("/api/messages").send({
                name: "John Inquirer",
                email: "inquirer@example.com",
                phone: "9876543210",
                subject: "Wedding Shoot Inquiry",
                message: "Hello, looking for a wedding photography quote.",
            });
            assert.equal(res.status, 201);
            assert.equal(res.body.success, true);
            assert.equal(res.body.data.status, "New");
            testMessageId = res.body.data._id;
        });

        test("POST /api/messages - rejects message with invalid email format", async () => {
            const res = await request(app).post("/api/messages").send({
                name: "John Inquirer",
                email: "invalid-email-address",
                message: "Hello",
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.success, false);
            assert.match(res.body.message, /valid email address/i);
        });

        test("GET /api/messages - blocks unauthenticated client from viewing messages (401)", async () => {
            const res = await request(app).get("/api/messages");
            assert.equal(res.status, 401);
        });

        test("GET /api/messages - blocks authenticated client from viewing messages (403)", async () => {
            const res = await request(app)
                .get("/api/messages")
                .set("Authorization", `Bearer ${clientToken}`);
            assert.equal(res.status, 403);
        });

        test("GET /api/messages - allows admin to view contact messages", async () => {
            const res = await request(app)
                .get("/api/messages")
                .set("Authorization", `Bearer ${adminToken}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.ok(Array.isArray(res.body.messages));
        });

        test("PUT /api/messages/:id/status - allows admin to mark message as Read", async () => {
            if (!testMessageId) return;
            const res = await request(app)
                .put(`/api/messages/${testMessageId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "Read" });
            assert.equal(res.status, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.data.status, "Read");
        });

        test("PUT /api/messages/:id/status - rejects invalid ObjectId format with 400", async () => {
            const res = await request(app)
                .put("/api/messages/invalid-id/status")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "Read" });
            assert.equal(res.status, 400);
            assert.match(res.body.message, /Invalid ID format/i);
        });
    });
});
