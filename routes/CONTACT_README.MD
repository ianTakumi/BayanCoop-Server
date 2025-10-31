# 📞 Contact Management API Documentation

## Base URL

```
http://localhost:5000/api/v1/contacts
```

---

## 📊 Endpoints

### 1. Get Total Contact Count

**GET** `/api/contacts/total-contact-count`

**Response:**

```json
{
  "message": "Total contact count fetched successfully",
  "total": 42
}
```

---

### 2. Get All Contacts

**GET** `/api/contacts/`

**Response:**

```json
{
  "message": "Contacts fetched successfully",
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "subject": "Inquiry",
      "message": "Hello...",
      "status": "open",
      "created_at": "2023-10-01T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### 3. Create New Contact

**POST** `/api/contacts/`

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "General Inquiry",
  "message": "I would like to know more..."
}
```

**Response:**

```json
{
  "message": "Contact created successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "subject": "General Inquiry",
    "message": "I would like to know more...",
    "status": "open",
    "created_at": "2023-10-01T10:30:00Z"
  }
}
```

---

### 4. Update Contact Status

**PUT** `/api/contacts/:id`

**Request Body:**

```json
{
  "status": "in_progress"
}
```

**Response:**

```json
{
  "message": "Contact updated successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "subject": "General Inquiry",
    "message": "I would like to know more...",
    "status": "in_progress",
    "created_at": "2023-10-01T10:30:00Z"
  }
}
```

---

## 🚦 Status Types

- `open` - New inquiry
- `in_progress` - Being handled
- `resolved` - Issue solved
- `closed` - Ticket closed
- `pending` - Waiting for response

---

## ❌ Error Responses

**400 Bad Request:**

```json
{
  "message": "Please fill up all the fields"
}
```

**500 Server Error:**

```json
{
  "message": "Server Error",
  "error": "Error details here"
}
```
