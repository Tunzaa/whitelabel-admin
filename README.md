# Meneja - Whitelabel Admin Dashboard

A modern admin dashboard built with Next.js 15, React 19, and shadcn/ui components for managing whitelabel e-commerce operations.

## Tech Stack

- **Framework**: Next.js 15.3.8 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (New York style)
- **State Management**: Zustand 5
- **Authentication**: NextAuth v5 (beta)
- **Forms**: React Hook Form + Zod
- **Data Fetching**: Axios
- **Internationalization**: i18next (English & Swahili)
- **Charts**: Recharts
- **Maps**: React Leaflet, Google Maps
- **Database**: MongoDB
- **Package Manager**: pnpm 10.28.2

## Prerequisites

- Node.js 20+
- pnpm 10.28.2+
- Access to the backend API

## Installation

```bash
# Install dependencies
pnpm install
```

## Environment Setup

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Configure the following environment variables:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# GitHub OAuth (optional - for development)
# GITHUB_ID=your_github_client_id
# GITHUB_SECRET=your_github_client_secret

# API Configuration
NEXT_PUBLIC_API_URL=https://matchmaking-api.usereli.tech/api
```

3. Generate a new NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
whitelabel-admin/
├── app/                            # Next.js App Router (pages & layouts)
│   ├── (auth)/                     # Authentication route group (sign-in, password reset)
│   ├── dashboard/                  # Protected dashboard routes (requires authentication)
│   │   ├── layout.tsx              # Dashboard layout (sidebar, header, tenant context)
│   │   ├── affiliates/             # Affiliate management
│   │   ├── auth/                   # User & role management
│   │   ├── categories/             # Category management
│   │   ├── delivery-partners/      # Delivery partner management
│   │   ├── orders/                 # Order management
│   │   ├── products/               # Product catalog management
│   │   ├── profile/                # User profile settings
│   │   ├── rewards/                # Rewards program management
│   │   ├── tenants/                # Tenant/organization management
│   │   ├── vendor-loans/           # Vendor loan management
│   │   └── vendors/                # Vendor management
│   ├── api/                        # API route handlers
│   │   ├── auth/                   # NextAuth endpoints
│   │   └── health/                 # Health check endpoint
│   ├── types/                      # Global TypeScript type definitions
│   ├── layout.tsx                  # Root layout component
│   ├── client-layout.tsx           # Client-side layout wrapper
│   └── globals.css                 # Global styles & Tailwind imports
├── components/                     # Shared/reusable UI components
│   ├── ui/                         # shadcn/ui component library
│   ├── auth/                       # Authentication components (can, forbidden, with-authorization)
│   ├── ThemeToggle/                # Theme switching (provider & toggle)
│   ├── app-sidebar.tsx             # Main sidebar navigation
│   ├── auth-header.tsx             # Authentication header
│   └── [other shared components]   # Badge, charts, etc.
├── features/                       # Feature modules (domain-driven architecture)
│   ├── affiliates/                 # Affiliate management
│   ├── auth/                       # Authentication feature
│   ├── categories/                 # Category management
│   ├── configurations/             # System configurations
│   ├── dashboard/                  # Dashboard overview
│   ├── delivery-partners/          # Delivery partner management
│   ├── loans/                      # Loan management
│   ├── orders/                     # Order management
│   ├── products/                   # Product management
│   ├── rewards/                    # Rewards program
│   ├── settings/                   # Settings management
│   ├── tenants/                    # Tenant management
│   └── vendors/                    # Vendor management
│   [Each feature typically contains:]
│   ├── components/                 # Feature-specific UI components
│   ├── data/                       # API calls & data fetching logic
│   ├── schema.ts                   # Zod validation schemas
│   ├── store.ts                    # Zustand state management
│   └── types.ts                    # TypeScript type definitions
├── hooks/                          # Custom React hooks
│   ├── use-debounce.ts             # Debounce utility
│   └── use-mobile.ts               # Mobile/responsive detection
├── lib/                            # Core utilities & configurations
│   ├── api/                        # API client setup (Axios)
│   ├── core/                       # Core utilities (auth, types)
│   ├── services/                   # External service integrations
│   ├── stores/                     # Global state stores
│   ├── auth.config.ts              # NextAuth configuration
│   ├── auth.ts                     # Auth utilities
│   ├── cache.ts                    # Caching utilities
│   ├── colors.ts                   # Color utilities
│   └── utils.ts                    # General utility functions
├── src/                            # Source directory
│   └── i18n/                       # Internationalization setup
│       ├── locales/                # Translation files (en, sw)
│       ├── hooks/                  # i18n hooks
│       ├── client-init.tsx         # Client-side initialization
│       ├── core.ts                 # i18n core configuration
│       └── index.ts                # i18n exports
├── public/                         # Static assets (images, icons, etc.)
├── .env.example                    # Environment variables template
├── .eslintrc.json                  # ESLint configuration
├── .gitignore                      # Git ignore rules
├── components.json                 # shadcn/ui configuration
├── ecosystem.config.js             # PM2 process manager config
├── middleware.ts                   # Next.js middleware (route protection)
├── next.config.ts                  # Next.js configuration
├── nixpacks.toml                   # Nixpacks deployment config
├── package.json                    # Dependencies & scripts
├── pnpm-lock.yaml                  # pnpm lock file
├── pnpm-workspace.yaml             # pnpm workspace config
├── postman_collection.json         # API testing collection
├── tailwind.config.js              # Tailwind CSS configuration
└── tsconfig.json                   # TypeScript configuration
```

## Key Features

- **Authentication**: Role-based access control with NextAuth v5
- **Multi-language**: English and Swahili support via i18next
- **Dark Mode**: Theme toggle with next-themes
- **Data Tables**: Advanced tables with sorting, filtering, pagination
- **Forms**: Validation with React Hook Form and Zod schemas
- **Charts**: Interactive data visualization with Recharts
- **Maps**: Location-based features with Leaflet and Google Maps
- **File Upload**: Drag-and-drop file upload component
- **Toast Notifications**: User feedback with Sonner

## Authentication

The application uses NextAuth v5 with credentials provider. Authentication flow:

1. Users sign in with email/password via `/auth/login` API endpoint
2. Backend returns access token and user data
3. NextAuth manages session with JWT strategy
4. Token stored in localStorage for API client
5. Protected routes require authentication (middleware)

**Roles**: support, admin, business_owner, etc. (defined in `lib/core/auth.ts`)

## API Integration

The app uses a custom API client configured in `lib/api/client.ts`:

- Base URL: `NEXT_PUBLIC_API_URL` environment variable
- Automatic token injection from localStorage
- Axios interceptors for request/response handling
- Proxy configuration for development (see `next.config.ts`)

**API Proxy**: Development requests to `/api/proxy/*` are proxied to backend at `http://164.92.162.131:8000/v1/*`

## Feature Modules

Each feature module follows a consistent structure:

```
features/[feature]/
├── components/    # Feature-specific components
├── data/          # API calls and data fetching
├── schema.ts      # Zod validation schemas
├── store.ts       # Zustand state management
└── types.ts       # TypeScript types
```

## Internationalization

Translation files are located in `src/i18n/locales/`:

- `en/` - English translations
- `sw/` - Swahili translations

Use the `useTranslation` hook from `react-i18next` in components.

## Styling

The project uses Tailwind CSS 4 with shadcn/ui components:

- Component variants managed with `class-variance-authority`
- Utility classes combined with `clsx` and `tailwind-merge`
- Custom animations with `tw-animate-css`
- Theme variables defined in `app/globals.css`

## Deployment

### Production Build

```bash
pnpm build
pnpm start
```

### Environment Variables for Production

Ensure all required environment variables are set in your production environment:

- `NEXTAUTH_URL` - Production URL
- `AUTH_TRUST_HOST` - Trusted host
- `NEXTAUTH_SECRET` - Secure secret
- `NEXT_PUBLIC_API_URL` - Production API endpoint

### Deployment Platforms

The application can be deployed to:
- Vercel (recommended)
- Digital Ocean (using Nixpacks - see `nixpacks.toml`)
- Any Node.js hosting platform

## Code Quality

- **ESLint**: Configured with Next.js rules
- **TypeScript**: Strict mode enabled
- **Prettier**: Code formatting (configure in `.prettierrc` if needed)

## Contributing

1. Create a feature branch from `main`
2. Follow the existing code structure and patterns
3. Use TypeScript for all new code
4. Add appropriate error handling
5. Test thoroughly before submitting PR
6. Update documentation as needed

## Troubleshooting

**Build errors with TypeScript**: The project currently ignores build errors (`ignoreBuildErrors: true` in `next.config.ts`). Fix type errors before production deployment.

**Authentication issues**: Check that `NEXTAUTH_SECRET` is properly set and the API endpoint is accessible.

**API proxy failures**: Verify the backend URL in `next.config.ts` matches your development environment.

## License

Private project - Tunzaa
