# Maha Creative Photography — Backend API

## Project Overview
The backend for **Maha Creative Photography** is a RESTful API built with Node.js, Express.js, and MongoDB Atlas. It handles user and admin authentication, dynamic gallery management, customizable photography packages, end-to-end booking lifecycle management, contact inquiries, image optimization via Sharp, and automated transactional email notifications via Nodemailer.

---

## Features

### Client Features & Endpoints
* **Authentication**: Client signup, login, password recovery (`/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password/:token`).
* **Profile**: Authenticated user profile retrieval (`/api/auth/profile`).
* **Packages**: Public browsing of photography packages with pricing, category, delivery time, and highlights (`/api/packages`, `/api/packages/:packageId`).
* **Gallery**: Public retrieval of categorized portfolio images (`/api/gallery`).
* **Bookings**: Authenticated session booking with automated email dispatch and client-specific booking history (`/api/bookings`, `/api/bookings/my-bookings`).
* **Contact & Inquiries**: Public submission of customer inquiries and messages (`/api/messages`).

### Admin Features & Endpoints
* **Admin Authentication**: Role-restricted admin login and password recovery with `adminOnly` verification (`/api/auth/login`, `/api/auth/admin/forgot-password`, `/api/auth/admin/reset-password/:token`).
* **Dashboard Metrics**: Comprehensive summary of total packages, gallery items, bookings, pending/confirmed/cancelled sessions.
* **User Management**: Admin can inspect registered users and manage client accounts (`/api/auth/users`, `/api/auth/users/:id`).
* **Booking Management**: View all customer bookings, filter by status, and update status (`PENDING`, `CONFIRMED`, `CANCELLED`) with automatic customer email notifications (`/api/bookings`, `/api/bookings/:id/status`, `/api/bookings/:id`).
* **Gallery Management**: Add new photos with auto-optimization to WebP, update titles/categories, and delete photos (`/api/gallery`, `/api/gallery/:id`).
* **Package Management**: Create, update, or remove photography packages with custom highlights and image banners (`/api/packages`, `/api/packages/:packageId`).
* **Message Management**: Review incoming customer inquiries and update read status (`/api/messages`, `/api/messages/:id/status`, `/api/messages/:id`).

---

## Technology Stack

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MongoDB (Atlas)
* **ODM**: Mongoose
* **Authentication**: JSON Web Tokens (jsonwebtoken) & bcryptjs
* **Image Processing**: Multer & Sharp (WebP compression & automatic resizing)
* **Email Service**: Nodemailer (HTML & text email templates)
* **CORS**: cors middleware with environment-driven origins and wildcard Vercel support

---

## Authentication

* **JWT Authentication**: Secure tokens are signed with `JWT_SECRET` and contain user ID and role (`client` or `admin`).
* **Password Hashing**: Passwords are encrypted using `bcryptjs` with 10 salt rounds before persisting to MongoDB.
* **Role-Based Access Control (RBAC)**:
  * `protect`: Verifies the Bearer JWT token from the `Authorization` header.
  * `adminOnly`: Restricts administrative routes to users with `role: "admin"`.
* **Password Recovery**: Generates secure random crypto hex tokens with 1-hour expiration stored hashed in MongoDB.

---

## Project Architecture

```
React Frontend
      ↓ (HTTP / REST + Bearer JWT)
    Axios
      ↓
 Express API Server (server.js)
      ↓ (Middleware: CORS, JSON, Multer, protect, adminOnly)
   Routes (/api/auth, /api/packages, /api/gallery, /api/bookings, /api/messages)
      ↓
 Controllers (authController, packageController, bookingController, etc.)
      ↓
 Mongoose Models (User, Package, Gallery, Booking, Message)
      ↓
 MongoDB Atlas Database
```

---

## Booking Flow

```
Client (Select Package)
      ↓
Booking Form (Event details, date, location)
      ↓
POST /api/bookings (Protected via Bearer JWT)
      ↓
MongoDB (Stores Booking with status: "PENDING")
      ↓
Email Service (Dispatches "Booking Received - Pending Confirmation" Email to Client)
      ↓
Admin Dashboard (Admin reviews booking under Bookings tab)
      ↓
PUT /api/bookings/:id/status ("CONFIRMED" or "CANCELLED")
      ↓
Email Service (Dispatches "Booking Confirmed" or "Booking Cancelled" Email to Client)
      ↓
Client "My Bookings" page reflects updated status in real-time
```

---

## Admin → Client Data Flow

```
Admin updates database (Add/Edit/Delete Package or Gallery)
      ↓
Express Controller validates & optimizes uploaded media via Sharp
      ↓
MongoDB Atlas updated (Single Source of Truth)
      ↓
Success response returned to Admin
      ↓
Client navigates or refreshes page
      ↓
GET /api/packages or GET /api/gallery
      ↓
Client UI renders latest database values dynamically
```

---

## Environment Variables

Refer to `.env.example` for variable names. Never commit actual secrets to version control.

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM="Maha Creative Photography" <your_email@gmail.com>
EMAIL_LOGO_URL=https://your-domain.com/images/Logo.png
```

---

## Installation & Running Locally

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Or start in production mode
npm start
```

Backend will run on `http://localhost:5000`.
Health check endpoints:
* `http://localhost:5000/`
* `http://localhost:5000/api/health`

---

## Deployment (Render / Railway)

1. Connect the GitHub repository to Render as a **Web Service**.
2. Set Root Directory to `backend` (or deploy directly from the backend repository).
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Configure Environment Variables in Render dashboard:
   * `MONGO_URI`
   * `JWT_SECRET`
   * `CLIENT_URL` (your deployed Vercel frontend URL)
   * `EMAIL_USER` & `EMAIL_PASSWORD` (for booking & reset password emails)
6. Ensure CORS in `server.js` permits requests from your frontend domain.

---

## GitHub Repository
* **Backend Repository**: `https://github.com/madheshwarant-fullstack-dev/maha-creative-photography-backend.git`
