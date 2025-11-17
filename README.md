# MailShop Frontend

Premium Mail Accounts Marketplace built with Angular 17

## Features

- ✅ Angular 17 with SSR (Server-Side Rendering)
- ✅ Bootstrap 5 + Bootstrap Icons
- ✅ JWT Authentication with Refresh Token
- ✅ Role-based Access Control (User/Admin)
- ✅ Multi-layout Architecture (Client + Admin)
- ✅ Lazy Loading Routes
- ✅ SEO Optimized with Meta Service
- ✅ SCSS with BEM Naming Convention
- ✅ Standalone Components

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm start

# Navigate to http://localhost:4200
```

## Build

```bash
# Build for production
npm run build

# Build with SSR
npm run build:ssr

# Serve SSR build
npm run serve:ssr
```

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/          # Auth and Admin guards
│   │   ├── interceptors/    # HTTP interceptors
│   │   ├── models/          # Data models
│   │   └── services/        # Core services (API, Auth, SEO)
│   ├── layouts/
│   │   ├── client-layout/   # Client-facing layout
│   │   └── admin-layout/    # Admin dashboard layout
│   ├── modules/
│   │   ├── auth/            # Login, Register
│   │   ├── client/          # Home, Pricing, Blog, Mail Accounts
│   │   └── admin/           # Dashboard, Users, Mail Management
│   ├── app.routes.ts        # Route configuration
│   └── app.config.ts        # App configuration
├── environments/            # Environment configs
└── styles.scss             # Global styles
```

## Features Overview

### Authentication
- Login with JWT token
- Register new account
- Automatic token refresh
- HTTP-only cookie storage (localStorage as fallback)

### Client Features
- Home page with features showcase
- Pricing plans
- Blog listing
- Mail account management (CRUD)

### Admin Features
- Dashboard with statistics
- User management
- Mail account management
- Bulk operations
- CSV export capability

## Environment Variables

Create `environment.ts` and `environment.prod.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## Default Users

Contact backend team for default admin credentials.

## License

Proprietary - All rights reserved
