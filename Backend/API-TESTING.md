# Quick Postman Testing Order

Base URL: `http://localhost:5000`

## 1. Register customer
POST `/api/auth/register`
```json
{
  "name": "Ujjwal",
  "email": "ujjwal@example.com",
  "password": "123456",
  "phone": "9999999999",
  "role": "customer"
}
```
Copy the returned token.

## 2. Login
POST `/api/auth/login`
```json
{
  "email": "ujjwal@example.com",
  "password": "123456"
}
```

For protected requests set:
`Authorization: Bearer <TOKEN>`

## 3. Add vehicle
POST `/api/vehicles`
```json
{
  "type": "car",
  "make": "Maruti",
  "model": "Swift",
  "registrationNumber": "UP14AB1234",
  "year": 2023,
  "color": "White"
}
```

## 4. Create emergency request
POST `/api/emergency`
```json
{
  "vehicle": "VEHICLE_ID",
  "issueType": "puncture",
  "description": "Front tyre punctured",
  "coordinates": [77.1025, 28.7041],
  "address": "Delhi",
  "estimatedAmount": 300
}
```

## 5. Mechanic account
Register another user with `"role": "mechanic"`, then create a mechanic profile and set it online.

## 6. Accept emergency
PATCH `/api/emergency/REQUEST_ID/accept`
Header: `Authorization: Bearer <MECHANIC_TOKEN>`

## 7. Update status
PATCH `/api/emergency/REQUEST_ID/status`
```json
{
  "status": "on_the_way"
}
```
Then use `arrived`, `repairing`, and `completed`.
