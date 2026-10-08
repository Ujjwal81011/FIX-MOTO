# 🚨 EmergencyFix Backend

MERN backend starter for **EmergencyFix — Your breakdown. Our response.**

## Included modules

1. Server setup
2. MongoDB/Mongoose connection
3. Folder structure
4. User model
5. JWT authentication + bcrypt password hashing
6. Vehicle model and CRUD APIs
7. Mechanic profile, online/offline status, location and nearby search
8. Emergency request creation, acceptance and status flow
9. Payment records (mock/manual payment flow; no live gateway)
10. Reviews and mechanic rating calculation
11. Notifications
12. Socket.IO real-time events
13. Error handling and role authorization

## Requirements

- Node.js 18+
- MongoDB local installation OR MongoDB Atlas
- Postman (recommended for API testing)

## Installation

```bash
npm install
```

Create `.env` from `.env.example`.

### Local MongoDB

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/emergencyfix
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

### MongoDB Atlas

Use your Atlas connection string for `MONGO_URI`.

## Run

Normal:

```bash
npm start
```

Development (nodemon is included as a dev dependency):

```bash
npm run dev
```

## Main API endpoints

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Users
- GET `/api/users/profile`
- PUT `/api/users/profile`
- GET `/api/users` (admin)

### Vehicles
- POST `/api/vehicles`
- GET `/api/vehicles`
- GET `/api/vehicles/:id`
- PUT `/api/vehicles/:id`
- DELETE `/api/vehicles/:id`

### Mechanics
- GET `/api/mechanics/nearby?lng=77.1&lat=28.6`
- GET `/api/mechanics/profile`
- PUT `/api/mechanics/profile`
- PATCH `/api/mechanics/status`
- PATCH `/api/mechanics/location`
- GET `/api/mechanics` (admin)

### Emergency
- POST `/api/emergency`
- GET `/api/emergency/mine`
- GET `/api/emergency/:id`
- PATCH `/api/emergency/:id/accept`
- PATCH `/api/emergency/:id/status`
- PATCH `/api/emergency/:id/cancel`
- GET `/api/emergency/all` (admin)

### Payments
- POST `/api/payments`
- GET `/api/payments/mine`
- PATCH `/api/payments/:id/pay`

### Reviews
- POST `/api/reviews`
- GET `/api/reviews/mechanic/:mechanicId`

### Notifications
- GET `/api/notifications`
- PATCH `/api/notifications/:id/read`

## Important

This project intentionally uses a simple payment record flow. A real UPI/card gateway such as Razorpay/Stripe must be integrated separately before production use.

For production, also add request validation, rate limiting, helmet, refresh tokens, file storage for photos, proper admin creation, payment webhooks, audit logs and stricter CORS/security settings.
