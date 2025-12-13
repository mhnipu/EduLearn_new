# EduLearn - Learning Management System

## 🗄️ Database Management

**This project uses External Supabase Database** (completely independent from Lovable cloud).

### ⚡ Quick Setup (External Supabase)

1. **Get Your Supabase Credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Navigate to **Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

2. **Create `.env` file** in the root directory:
   ```bash
   # Your External Supabase Credentials
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
   ```
   
   **⚠️ Important**: Replace with your actual Supabase project credentials!

3. **Apply Database Migrations**:
   - See [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](./docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md) for detailed instructions
   - Or use Supabase Dashboard → SQL Editor to run migration files from `supabase/migrations/`

4. **Verify Connection**:
   - See [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md) for verification steps
   - Start dev server: `npm run dev`
   - Test login/signup to verify database connection

5. **Fix Security Issues** (Important!):
   - **⚡ FINAL SOLUTION (1 min)**: [`SECURITY_FIX_FINAL.md`](./SECURITY_FIX_FINAL.md) - Dashboard method!
   - **Quick Fix**: [`QUICK_FIX_SECURITY.md`](./QUICK_FIX_SECURITY.md)
   - **Detailed Guide**: [`APPLY_SECURITY_FIX.md`](./APPLY_SECURITY_FIX.md)
   - This is a high-priority security issue

6. **Enhanced Authentication** (Optional - Phone Support):
   - **⚡ Quick Summary**: [`AUTH_ENHANCEMENT_SUMMARY.md`](./AUTH_ENHANCEMENT_SUMMARY.md)
   - **📱 Full Guide**: [`EXTERNAL_SUPABASE_AUTH_GUIDE.md`](./EXTERNAL_SUPABASE_AUTH_GUIDE.md)
   - **Quick Apply**: Run `.\apply-auth-enhancements.ps1` in PowerShell
   - Features: Email/Phone login, Better logging, External Supabase verification

### Managing Your Database

- **Quick Setup**: See [`docs/setup/QUICK_SETUP.md`](./docs/setup/QUICK_SETUP.md)
- **Full Guide**: See [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](./docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md)
- **User Management**: See [`docs/supabase/SUPABASE_USER_MANAGEMENT.md`](./docs/supabase/SUPABASE_USER_MANAGEMENT.md)
- **Supabase Dashboard**: [app.supabase.com](https://app.supabase.com) → Your Project
- **Table Editor**: View and edit data directly in Supabase Dashboard
- **SQL Editor**: Run custom queries and migrations
- **Authentication**: Manage users via **Authentication** → **Users**

### Documentation

- **📚 Full Documentation Index**: See [`docs/INDEX.md`](./docs/INDEX.md)
- **📖 Setup Guides**: [`docs/setup/`](./docs/setup/)
- **🗄️ Supabase Guides**: [`docs/supabase/`](./docs/supabase/)
- **📘 Feature Guides**: [`docs/guides/`](./docs/guides/)
- **🧪 Testing**: [`docs/testing/`](./docs/testing/)

---

## Project info

**Lovable Project URL**: https://lovable.dev/projects/512c431a-eea6-4623-9632-70ce9a183cdc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/512c431a-eea6-4623-9632-70ce9a183cdc) and start prompting.

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

Simply open [Lovable](https://lovable.dev/projects/512c431a-eea6-4623-9632-70ce9a183cdc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
