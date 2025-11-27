# Events API Documentation

## 📋 Overview

RESTful API for managing events, seminars, webinars, and conferences.

## 🚀 Base URL

```
http://localhost:3000/api/events
```

## 📊 API Endpoints

### 1. Get All Events

**GET** `/`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 10 | Number of events per page |
| `eventType` | string | - | Filter by event type (seminar, webinar, training, workshop, conference) |
| `status` | string | - | Filter by status (draft, published, cancelled, completed, archived) |
| `isOnline` | boolean | - | Filter by online/offline events |
| `upcomingOnly` | boolean | - | Show only upcoming events |
| `search` | string | - | Search in title and description |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Event Title",
      "description": "Event Description",
      "start_date": "2024-03-15T09:00:00+00:00",
      "end_date": "2024-03-16T17:00:00+00:00",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "event_type": "seminar",
      "location": "Manila",
      "is_online": false,
      "meeting_link": null,
      "venue": "Conference Hall",
      "max_attendees": 100,
      "current_attendees": 0,
      "status": "published",
      "featured_image": "https://example.com/image.jpg",
      "registration_deadline": null,
      "created_by": null,
      "created_at": "2025-11-13T10:45:44.916279+00:00",
      "updated_at": "2025-11-13T10:45:44.916279+00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### 2. Get Single Event

**GET** `/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Event ID |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Event Title",
    "...": "other event properties"
  }
}
```

---

### 3. Create Event

**POST** `/`

**Request Body:**

```json
{
  "title": "Event Title*",
  "description": "Event Description",
  "start_date": "2024-03-15T09:00:00+00:00*",
  "end_date": "2024-03-16T17:00:00+00:00*",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "event_type": "seminar*",
  "location": "Manila",
  "is_online": false,
  "meeting_link": "https://meet.google.com/abc",
  "venue": "Conference Hall",
  "max_attendees": 100,
  "featured_image": "https://example.com/image.jpg",
  "registration_deadline": "2024-03-14T23:59:00+00:00",
  "status": "draft"
}
```

**Required Fields:** `title`, `start_date`, `end_date`, `event_type`

**Event Types:** `seminar`, `webinar`, `training`, `workshop`, `conference`

**Status Values:** `draft`, `published`, `cancelled`, `completed`

**Response:**

```json
{
  "success": true,
  "data": { "event object" },
  "message": "Event created successfully"
}
```

---

### 4. Update Event

**PUT** `/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Event ID |

**Request Body:**

```json
{
  "title": "Updated Event Title",
  "description": "Updated Description",
  "status": "published",
  "max_attendees": 150
}
```

**Note:** Only include fields you want to update

**Response:**

```json
{
  "success": true,
  "data": { "updated event object" },
  "message": "Event updated successfully"
}
```

---

### 5. Archive Event

**PATCH** `/:id/archive`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Event ID |

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "data": { "archived event object" },
  "message": "Event archived successfully"
}
```

---

### 6. Delete Event Permanently

**DELETE** `/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Event ID |

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "message": "Event deleted permanently"
}
```

---

### 7. Get Upcoming Events

**GET** `/upcoming`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 5 | Number of upcoming events to return |

**Response:**

```json
{
  "success": true,
  "data": [
    { "event object" },
    { "event object" }
  ]
}
```

---

### 8. Get Events by Date Range

**GET** `/range/:startDate/:endDate`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO Date | Start date (e.g., 2024-03-01) |
| `endDate` | ISO Date | End date (e.g., 2024-03-31) |

**Response:**

```json
{
  "success": true,
  "data": [
    { "event object" },
    { "event object" }
  ]
}
```

---

### 9. Get Events Statistics

**GET** `/stats`

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "byType": {
      "seminar": 10,
      "webinar": 5,
      "training": 6,
      "workshop": 3,
      "conference": 1
    },
    "byStatus": {
      "draft": 5,
      "published": 15,
      "cancelled": 2,
      "completed": 3,
      "archived": 0
    },
    "upcoming": 8,
    "online": 12,
    "offline": 13
  }
}
```

## 🔧 Event Status Flow

```
draft → published → completed
          ↓
       cancelled
          ↓
       archived
```

## 🎯 Event Types

- **seminar** - Educational sessions with expert speakers
- **webinar** - Online seminars and workshops
- **training** - Skill development sessions
- **workshop** - Hands-on practical sessions
- **conference** - Large multi-session events

## ❗ Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Event not found
- `500` - Internal server error

## 📝 Example Usage

### Create a new webinar:

```javascript
fetch("/api/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "React Web Development Workshop",
    description: "Learn React fundamentals and best practices",
    start_date: "2024-04-01T09:00:00Z",
    end_date: "2024-04-01T17:00:00Z",
    event_type: "webinar",
    is_online: true,
    meeting_link: "https://meet.google.com/abc-def-ghi",
    status: "published",
    max_attendees: 50,
  }),
});
```

### Get filtered events:

```javascript
fetch("/api/events?eventType=workshop&status=published&upcomingOnly=true");
```

### Archive an event:

```javascript
fetch("/api/events/638ef806-a84c-477e-bbb9-75c2fcf9732c/archive", {
  method: "PATCH",
});
```
