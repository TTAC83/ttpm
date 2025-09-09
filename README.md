# Thingtrax Implementation App

A web-based implementation management platform built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Magic link and email/password sign-in (invite-only)
- **Role-based Access**: Internal/external users with admin capabilities
- **Profile Management**: Update personal details and avatar
- **User Administration**: Invite users, manage roles and companies (admin only)
- **UK Localization**: Europe/London timezone, DD/MM/YYYY date format

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL for redirects
VITE_SITE_URL=http://localhost:5173
```

## Supabase Setup

1. **Authentication URLs**: In your Supabase dashboard, go to Authentication > URL Configuration and add your site URL:
   - Site URL: `http://localhost:5173` (development) or your production URL
   - Redirect URLs: Add the same URL(s)

2. **Storage**: The app uses a private `avatars` bucket for profile pictures. This is created automatically via migrations.

3. **Database**: The app expects the following database structure:
   - `companies` table
   - `profiles` table with user roles and company associations
   - RLS policies for secure data access
   - Admin RPC functions for user management

## Getting Started

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (see above)

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Visit the app**: Open http://localhost:5173

## User Roles

- **internal_admin**: Full access to all features including user management
- **internal_user**: Internal team member with standard access
- **external_admin**: External organization administrator
- **external_user**: External organization member

## Key Routes

- `/`: Login page with magic link and password options
- `/app`: Main dashboard (protected)
- `/app/profile`: User profile management
- `/app/admin/users`: User administration (internal_admin only)

## Architecture

- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Authentication**: Supabase Auth with custom profile management
- **Security**: Row Level Security (RLS) policies and role-based access control

## Admin Features

Internal administrators can:
- View all users in the system
- Invite new users via email
- Update user roles and company assignments
- Search and filter the user list

All admin operations use secure Supabase Edge Functions that validate permissions server-side.

## Development Notes

- Uses UK date formatting (DD/MM/YYYY) throughout the application
- All times display in Europe/London timezone
- Avatar uploads are stored securely in Supabase Storage
- Admin functions require proper authentication and role verification
- The app is invite-only - no public registration is available

---

## Original Lovable Project Info

**URL**: https://lovable.dev/projects/e3f969f8-6826-4c7f-a3a7-b970a8bb04f4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e3f969f8-6826-4c7f-a3a7-b970a8bb04f4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e3f969f8-6826-4c7f-a3a7-b970a8bb04f4) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)