# ContactLink

ContactLink is a backend service that resolves fragmented customer identities across multiple interactions.

Users often appear with different emails or phone numbers over time. This service links those records together and maintains a single canonical identity for each customer.

It behaves like a small identity graph engine built on top of PostgreSQL and exposed through a simple REST API.

## The Problem

A single customer may interact with a system multiple times using different contact information.

For example:

| Order | Email             | Phone |
| ----- | ----------------- | ----- |
| 1     | alice@example.com | 1234  |
| 2     | alice@example.com | 5678  |
| 3     | bob@example.com   | 5678  |

Although these look like different users, they are actually the **same person**, connected through shared emails and phone numbers.

Without reconciliation, systems treat them as separate accounts, leading to:

- duplicate users
- broken analytics
- poor personalization
- inconsistent customer history

ContactLink detects these overlaps and consolidates them into a single unified identity.

## Features

- Identity reconciliation using email or phone
- Automatic deduplication
- Deterministic primary contact selection (oldest wins)
- Primary / secondary linking model
- PostgreSQL persistence
- Dockerized deployment
- Clean layered architecture
- Global error handling

## API

### POST /identify

#### Request

```json
{
  "email": "alice@example.com",
  "phoneNumber": "5678"
}
```

#### Response

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com", "bob@example.com"],
    "phoneNumbers": ["1234", "5678"],
    "secondaryContactIds": [2, 3]
  }
}
```

## How it works

1. Find contacts where `email` OR `phoneNumber` matches
2. Collect all linked records
3. Choose oldest primary as canonical
4. Demote other primaries to secondary
5. Insert new information if unseen
6. Return consolidated identity

When two separate identity groups become connected, they are merged into a single group.

## Architecture

### Request Flow

```
Client
  → Route
  → Controller
  → Service (business logic)
  → Repository (SQL)
  → PostgreSQL
```

Errors propagate to a global middleware for consistent handling.

### Project Structure

```
src/
├── index.ts
├── routes/
├── controllers/
├── services/
├── repositories/
├── db/
├── middlewares/
└── utils/
```

Separation of concerns keeps business logic independent from HTTP and database layers.

## Data Model

### contacts

| Column         | Type      | Description               |
| -------------- | --------- | ------------------------- |
| id             | SERIAL    | Primary key               |
| email          | VARCHAR   | Optional email            |
| phoneNumber    | VARCHAR   | Optional phone            |
| linkedId       | INT       | Points to primary contact |
| linkPrecedence | ENUM      | `primary` or `secondary`  |
| createdAt      | TIMESTAMP | Creation time             |
| updatedAt      | TIMESTAMP | Update time               |
| deletedAt      | TIMESTAMP | Soft delete               |

Indexes on `email`, `phoneNumber`, and `linkedId` ensure fast lookups.

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Docker + Docker Compose
- pnpm

## Getting Started

### Option A — Docker (recommended)

```bash
docker compose up --build
```

Server runs at:

```
http://localhost:3000
```

### Option B — Local Development

Start database:

```bash
docker compose up -d postgres
```

Install dependencies:

```bash
pnpm install
```

Initialize DB:

```bash
pnpm db:init
```

Start dev server:

```bash
pnpm dev
```

## Example Requests

Create new identity:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","phoneNumber":"1234"}'
```

Merge identities:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","phoneNumber":"1234"}'
```

## Engineering Notes

- Deterministic merging using oldest record avoids conflicts
- Indexed lookups on email and phone ensure fast queries
- Layered architecture keeps business logic independent from HTTP and database layers
- Global error handling for consistent API responses
- Dockerized setup ensures consistent local and production environments

## Environment Variables

| Variable     | Description                  |
| ------------ | ---------------------------- |
| PORT         | Server port                  |
| DATABASE_URL | PostgreSQL connection string |

## Scripts

| Command      | Description                      |
| ------------ | -------------------------------- |
| pnpm dev     | Start dev server with hot reload |
| pnpm build   | Compile TypeScript               |
| pnpm start   | Run production build             |
| pnpm db:init | Initialize database schema       |
