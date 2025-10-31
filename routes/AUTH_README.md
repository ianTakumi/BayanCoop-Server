# 🔐 Authentication API Documentation

## Base URL

```
http://localhost:5000/api/v1/auth
```

---

## 📝 Endpoints

### 1. User Registration

**POST** `http://localhost:5000/api/v1/auth/user-registration`

Create a new user account.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**All fields are required**

**Success Response (201):**

```json
{
  "message": "User registered successfully!",
  "user": {
    "id": "user-uuid-here",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Email already exists / Invalid data
- `500 Server Error` - Internal server error

**Notes:**

- Auto-sends verification email to user
- User role is automatically set to "user"

---

### 2. User Login

**POST** `http://localhost:5000/api/v1/auth/user-login`

Authenticate user and return session.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Both fields are required**

**Success Response (200):**

```json
{
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "token_type": "bearer",
    "user": {
      "id": "user-uuid-here",
      "email": "john@example.com"
    }
  },
  "user": {
    "id": "user-uuid-here",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid credentials / User not found
- `500 Server Error` - Internal server error

---

## 🔄 Flow Details

### Registration Flow:

1. Creates auth user in Supabase
2. Inserts user record in `users` table
3. Sends email verification
4. Returns user data

### Login Flow:

1. Authenticates with Supabase Auth
2. Fetches user profile from `users` table
3. Returns session tokens + user data

---

## 🛡️ Security Notes

- Passwords are hashed by Supabase
- Email verification required for full access
- Use HTTPS in production
- Store tokens securely in frontend
