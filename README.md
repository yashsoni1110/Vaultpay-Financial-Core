# VaultPay - Financial Core Platform

VaultPay is a robust, full-stack financial application built for the Client Delivery Phase III (Finance & Security) project. It serves as a secure billing and payout management platform, allowing admins to manage clients, create invoices, and handle automated Stripe payments securely.

## Features
- **Role-Based Access Control (RBAC):** Strict separation between `admin` and `client` roles. Protected API routes ensure clients cannot access admin data.
- **Invoice Management:** Admins can create and manage detailed invoices, assign them to specific clients, and track their status in real-time.
- **Stripe Checkout Integration:** Clients can securely pay invoices via Stripe Checkout. Uses Idempotency Keys to prevent accidental double-charges.
- **Payment Links:** Generates reusable Stripe Payment Links for flat-fee services.
- **Real-Time Webhooks:** Listens for Stripe `checkout.session.completed` events to automatically mark invoices as paid without requiring manual refreshes.
- **PDF Generation:** Dynamically generates and streams native, heavily-formatted PDF invoices using `pdfkit`.
- **WebSocket Real-time Updates:** Connected clients instantly see when an invoice is marked as paid via `socket.io`.

## Tech Stack
- **Frontend:** React, Vite, Context API, React Router DOM
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Security:** JWT (JSON Web Tokens), bcryptjs, express-rate-limit, helmet, DOMPurify
- **Third-Party:** Stripe API, Stripe CLI (for webhook forwarding)

## Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)
- Stripe Account (Test Mode)
- Stripe CLI installed on your machine

## Environment Variables
You will need to set up `.env` files in both the client and server directories.
See `server/.env.example` for the required backend variables (Stripe Secret Key, Webhook Secret, JWT Secret, MongoDB URI).

## Getting Started

1. **Install Dependencies:**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Run the Backend:**
   ```bash
   cd server
   npm run dev
   ```

3. **Run the Frontend:**
   ```bash
   cd client
   npm run dev
   ```

4. **Listen for Stripe Webhooks (Terminal 3):**
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```
   *(Make sure to copy the webhook signing secret it gives you into your server's `.env` file!)*

## Security Notes
This platform was built with a zero-trust architecture. All endpoints strictly verify the JWT payload. Simulating an API attack with a valid client token against an admin route will correctly return a `403 Forbidden` response.
