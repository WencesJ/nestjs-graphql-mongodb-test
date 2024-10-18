# Task Management GraphQL API

A robust task management API built with NestJS, GraphQL, and MongoDB. This API allows users to manage tasks with features like priority levels, status tracking, and user assignment.

## Features

- 🔐 JWT Authentication & Authorization
- 📊 GraphQL API with full CRUD operations
- 📁 MongoDB integration with Mongoose ODM
- 🔍 Advanced filtering and pagination
- 🎯 Task priority and status management

## Prerequisites

- Node.js (v16 or later)
- MongoDB (v4.4 or later)
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/wencesj/nestjs-graphql-mongodb-test.git

# Install dependencies
yarn install
```

## Environment Setup

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE_AT='2h'
PORT=3000
```

## Running the Application

```bash
# Development
yarn start:dev

# Production
yarn build
yarn start:prod

# Run tests
yarn test
yarn test:e2e
```

## Authentication

The API uses JWT-based authentication. To access protected endpoints, you need to:

1. Register a new user
2. Login to receive a JWT token
3. Include the token in your GraphQL requests using the Authorization header:
   ```
   Authorization: Bearer <your_jwt_token>
   ```

## GraphQL Examples

### Protected Query Example: Fetch My Tasks

```graphql
query MyTasks($queryOptions: TaskFindAllArgs) {
  myTasks(queryOptions: $queryOptions) {
    data {
      id
      title
      description
      status
      priority
      assignedTo
    }
    metadata {
      total
      page
      limit
    }
  }
}
```

Query variables:
```json
{
  "queryOptions": {
    "page": 1,
    "limit": 10,
    "status": "PENDING",
    "priority": "HIGH"
  }
}
```

## Project Structure

```
src/
├── auth/
├── tasks/
├── users/
├── common/
├── utils/
│   └── config/
│   └── database/
│   └── filter/
│   └── guard/
│   └── logger/
└── app.module.ts
```

## Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e
```

## License

MIT