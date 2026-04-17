# HITU CTF Arena

![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.8.3-blue)
![React](https://img.shields.io/badge/react-18.3.1-61dafb)
![Supabase](https://img.shields.io/badge/supabase-2.103.0-37F981?logo=data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0i0J/RgNC40LHQutCw0YIg0J7QsNGA0YPQvtC5Ig0KQ0FMOiBodHRwczovL3N1cGFiYXNlLmNvbSIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDBDNS4zIDAgMCA1LjMgMCAxMHM1LjMgMTIgMTIgMTIgMTItNS4zIDEyLTEwUzE4LjcgMCAxMiAwem0wIDE4Yy00LjkwMSAwLTktNC4wOS05LTlzNC4wOS05IDktOSA5IDQuMTg5IDkgOS00LjA4OSA5LTkgOXptMi0xN2MwLTIuNDE4LTEuNTg0LTQtNC00cy00IDEuNTg0LTQgNCAxLjU4NCA0IDQgNCA0LTEuNTg0IDQtNHptLTYgNGMwIDEuMTQ1LS45NSAyLTEuODQ4LTJ6bTIuOTY5LTEwLjA5aC04Yy01Ljc2LTExLjYzIDEzLjIzLTE5Ljc1IDI0LTEzLjE1IDEuODktMS43NDYgMy44MjQtNC41IDUuNDYtNy4yMTcgMS45MSA2Ljc5IDE2LjE1IDEyIDE5LjI3IDEyIDEuNzA0IDAgMy42MzUtLjY0IDUuMTEzLTEuNjA5IDEuMjkzIDEuMzQ3IDIuMzU3IDIuNSAzLjY3NiAzLjYzNSAxLjg0IDEuNTU2IDQuMTY3IDMuMTU0IDYuMjI1IDQuMzE4LTIuMiAzLjkwNy02LjMzIDEuNTItOS4zMiA3Ljk2NC00Ljk3IDE1Ljk0LTE0LjQ4IDE4LjY4LTI2LjcxIDUuMTMgMTMuNzggOC4wOCAyNy42IDYuODMgMzguOTItMS42OCAxLjkxLTUuNTQgMi41Ny05LjI2IDIuNTctOC4zMiAwLTU1LjQtNDIuNjYtNTUuNC01NS40cy0zOC40MSA4Ny4zOC0xMS4zOCAxNDguODNjMCA2LjQzIDIuNDcgMTIuNSAxMC43MyAxNi4zNSAxMSAxOC4yNSA2LjIgMzYuODQtMjEuNzggNDAuMDRoLTE4Yy0yMC4xIDAtMzkuODIgMTUuNDEtNDYgMzcuNjQtOC4zMSAyNi42LTguOTUgNDAuMDRtLTE4IDE3LjFjMCA1LjY2OC0zLjAxMiAxMS4wOC04Ljk1IDExLjA4LTQuNTIzIDAtOC45NS0zLjQ2OC04Ljk1LTExLjA4IDAtNS4wMSAzLjU0Ni05LjUxIDguOTUtOS41MSAxMi41NSAwIDI0IDE5LjQ4IDI0IDQwUzE2LjUxIDQwIDIyIDQwYzAgNS4yMTMtMy4zMDMgOS40MDQtOC4yNCAxMi4wMy0yLjM2NCA2LjU5LTUuMDMgMTEuOTItNy42MiAxNy43Mi04LjAxMiAxOC42OS0yMS44MiAzOS03My44My0zNC40My0xOC4xMy00NS4xMS02LjA2LTY3LjA0IDIzLjQ4LTEuNTQ1IDguOTUtMi40NCAxNy44Ny0yLjQ0IDI2Ljc3IDAgMTYuOTYgMTIuNjggMzAuMTggMzAgMzAuMTggNS40MSAwIDEwLjU0LTEuMjYgMTUuMzktMy41NyAxLjY4IDEuNTU2IDMuMTYgMy4yNSAzLjI1IDUuNTEgMCAxLjcxLTEuMTI1IDMuMzItMyA0Ljk2bC0xMyAxNC40OC0zLjU0IDUuMDN6Ii8+PC9zdmc+)

A comprehensive cybersecurity competition platform built for university students. Features secure flag submission, team management, real-time scoreboard, and role-based access control.

## Features

### User Roles & Access Control
- **Admin**: Full system access, user management, CTF configuration
- **CTF Author**: Create and manage challenges, view submissions
- **Player**: Participate in CTF events, submit flags, join teams

### Core Functionality
- **Team Management**: Create teams, invite members via secure invite codes
- **Challenge System**: Multiple categories (Web, Crypto, Forensics, etc.), dynamic scoring
- **Real-time Scoreboard**: Paginated, live updates with team rankings
- **CTF Timing**: Configurable start/end times with automatic activation
- **Flag Submission**: Rate-limited, secure submission with audit logging
- **Hints System**: Purchaseable hints with point penalties
- **Ticket Support**: Participants can submit support tickets
- **Announcements**: Important CTF updates broadcast to all users
- **Badge System**: Achievement badges for milestones

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | Frontend framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| TailwindCSS | 3.4.17 | Styling |
| shadcn/ui | Latest | UI components |
| Supabase | 2.103.0 | Backend, Auth, Database |
| Zod | 3.25.76 | Validation |
| Zustand | 5.0.12 | State management |
| TanStack Query | 5.83.0 | Data fetching |
| React Router DOM | 6.30.1 | Routing |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/CTF-PROJECT.git
   cd CTF-PROJECT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

   Get these values from your Supabase project dashboard (Settings > API).

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at http://localhost:5173

5. **Build for production**
   ```bash
   npm run build
   ```

## Supabase Setup

### Database Schema

The project includes 19 migration files in `supabase/migrations/` that create the complete database structure:

**Key Tables:**
- `profiles` - User profile data
- `user_roles` - Role assignments (player, ctf_author, admin)
- `teams` - Team information
- `team_members` - Team membership
- `challenges` - CTF challenges
- `categories` - Challenge categories
- `solves` - Challenge solves by users
- `submissions` - All flag submission attempts
- `hints` - Challenge hints with penalties
- `submission_attempts` - Rate limiting tracking
- `audit_logs` - Security audit trail
- `ctf_settings` - CTF configuration
- `rules` - Competition rules
- `badges` - Achievement definitions
- `user_badges` - User badge awards
- `tickets` - Support tickets
- `announcements` - CTF announcements
- `admin_logs` - Admin action logging

### Row Level Security (RLS)

All tables are protected with RLS policies ensuring:
- Users can only access their own data
- Teams are publicly readable but modifications are restricted
- Submissions and solves are protected via database functions
- Admins have elevated access via custom `has_role()` function

### Database Functions

The production-hardening migration provides secure functions:

- `submit_flag(challenge_id, flag_text)` - Secure flag submission with rate limiting
- `join_team(invite_code, user_id)` - Secure team joining
- `leave_team(team_id)` - Safe team departure
- `transfer_team_leadership(team_id, new_leader_id)` - Leadership transfer
- `check_rate_limit(user_id, ip)` - Rate limiting verification
- `is_ctf_live()` - CTF status check
- `is_ctf_participant(user_id)` - Registration verification
- `detect_suspicious_activity()` - Security monitoring

### Roles Setup

1. Navigate to **Supabase Dashboard > Authentication > Users**
2. Register your first admin user through the application
3. Copy the user UUID
4. Execute the `setup-admin.sql` script in **SQL Editor**:
   ```sql
   -- Replace 'your-admin-user-id' with the actual UUID
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('your-admin-user-id', 'admin');
   ```

5. To create a CTF Author:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('author-uuid', 'ctf_author');
   ```

### Email Confirmation (Optional)

For production deployments, configure email confirmations:

1. Go to **Authentication > Settings**
2. Set up **Site URL** (your domain)
3. Configure **Redirect URLs** (list of allowed callback URLs)
4. Set up email provider (Resend, SendGrid, or custom SMTP)

## Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-org/CTF-PROJECT.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Import your GitHub repository at [vercel.com](https://vercel.com)
   - Configure environment variables:
     ```
     VITE_SUPABASE_URL = https://your-project.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY = your-anon-key
     ```
   - Deploy settings:
     - Build command: `npm run build`
     - Output directory: `dist`
     - Install command: `npm install`

3. **Post-deployment**
   - Verify environment variables in Vercel dashboard
   - Set up custom domain if needed
   - Enable HTTPS (automatic on Vercel)

### Other Static Hosts

This is a static SPA, deployable to any static hosting:

- **Netlify**: Connect repo, set build settings
- **GitHub Pages**: Use `gh-pages` branch
- **AWS S3 + CloudFront**: Upload `dist/` folder contents
- **Railway**: Static site hosting
- **Cloudflare Pages**: Git integration, fast CDN

See `DEPLOYMENT.md` for detailed deployment instructions.

### Adapter Configuration for SSR

For Next.js SSR deployment, add a client-only wrapper to prevent hydration mismatches:

```tsx
"use client";

import dynamic from 'next/dynamic';

// Dynamically import components that use browser-specific APIs
const SupabaseProvider = dynamic(() => import('@/contexts/SupabaseProvider'), {
  ssr: false
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
```

## Security Features

### Row Level Security (RLS)

All database tables implement RLS policies preventing unauthorized access:

```sql
-- Example: Only users can view their own profile
CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Example: Admins can manage everything
CREATE POLICY "Admins manage all"
ON profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### Rate Limiting

- **Submission attempts**: Max 10 failed submissions per minute per user
- **IP-based limiting**: Max 20 failed submissions per minute per IP
- Tracked in `submission_attempts` table
- Implemented in `check_rate_limit()` database function

### Audit Logging

All critical actions are logged:
- User authentication events
- Flag submissions (correct/incorrect)
- Team joins/leaves
- Admin actions
- Suspicious activity detection

**Key audit tables:**
- `audit_logs` - General audit trail
- `admin_logs` - Admin-specific actions
- `submission_attempts` - Rate limiting & brute-force detection

### Input Validation

All user inputs validated with **Zod** schemas:

```typescript
import { z } from 'zod';

const flagSchema = z.object({
  challengeId: z.string().uuid(),
  flag: z.string().min(1).max(255)
});
```

### Secure File Handling

- Challenge files stored in Supabase Storage
- Access controlled via RLS policies
- File size limits enforced
- Virus scanning recommended for production

### XSS Protection

- React's built-in XSS protection
- DOMPurify for HTML sanitization
- Content Security Policy (CSP) headers recommended

### Authentication Security

- Supabase Auth with JWT tokens
- Session persistence with auto-refresh
- Password reset flows
- Email verification (optional)

## Project Structure

```
CTF-PROJECT/
├── supabase/
│   └── migrations/          # Database schema migrations
│       ├── 001_initial_schema.sql
│       ├── 002_insert_roles.sql
│       ├── 003_rls_policies.sql
│       └── ...
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Layout wrappers
│   │   ├── ProtectedRoute.tsx
│   │   └── CTFGate.tsx
│   ├── pages/              # Route pages
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── author/         # Author management pages
│   │   ├── ChallengesPage.tsx
│   │   ├── ScoreboardPage.tsx
│   │   └── ...
│   ├── lib/                # Utilities
│   ├── stores/             # Zustand stores
│   │   └── authStore.ts    # Authentication state
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts   # Supabase client
│   │       └── types.ts    # TypeScript types
│   ├── hooks/              # Custom React hooks
│   └── App.tsx             # Main app with routes
├── public/                 # Static assets
├── dist/                   # Production build
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example            # Environment template
├── .env                    # Local environment (gitignored)
├── README.md
├── DEPLOYMENT.md           # Detailed deployment guide
├── setup-admin.sql         # Admin initialization script
└── production-hardening-migration.sql
```

## Development Workflow

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### Adding New Database Columns

1. Create a new migration file:
   ```bash
   # Manual: Create supabase/migrations/XXX_description.sql
   ```

2. Include proper RLS policies:
   ```sql
   ALTER TABLE public.table_name ADD COLUMN new_column TEXT;
   
   -- Update RLS policies to include new column access
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   CREATE POLICY "policy_name" ON table_name
   FOR UPDATE TO authenticated
   USING (condition)
   WITH CHECK (condition);
   ```

3. Update TypeScript types:
   ```bash
   # Regenerate types from Supabase
   npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
   ```

## API Reference

### Database Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `submit_flag(challenge_id, flag)` | Submit challenge flag | `challenge_id: UUID`, `flag: TEXT` |
| `join_team(invite_code, user_id)` | Join team with invite code | `invite_code: TEXT`, `user_id: UUID` |
| `leave_team(team_id)` | Leave current team | `team_id: UUID` |
| `transfer_team_leadership(team_id, new_leader)` | Transfer leadership | `team_id: UUID`, `new_leader: UUID` |
| `is_ctf_live()` | Check if CTF is active | No parameters |
| `get_paginated_challenges(page_size, offset)` | Get paginated challenges | `page_size: INTEGER`, `offset: INTEGER` |
| `get_paginated_scoreboard(page_size, offset)` | Get paginated scoreboard | `page_size: INTEGER`, `offset: INTEGER` |
| `detect_suspicious_activity()` | Security monitor | No parameters |

### Supabase Edge Functions

Edge Functions can be deployed for server-side logic:

```bash
# Deploy function
npx supabase functions deploy function-name

# List all functions
npx supabase functions list
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



---

**Built with ❤️ for the cybersecurity community**