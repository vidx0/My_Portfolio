# Dark portfolio — GitHub Pages edition

This edition is static HTML/CSS/JavaScript, designed to run at the existing GitHub Pages repository URL and keep the same assets. It uses Supabase for public project data and browser-based admin sign-in; it does not need a build step.

## 1. Configure Supabase

1. In Supabase, open **Project Settings → Data API** and copy the base **Project URL** (must end in `.supabase.co`, with no `/rest/v1/` suffix).
2. Copy the **publishable key** (`sb_publishable_...`). Never use a service-role/secret key in this website.
3. Edit `javascript/supabase-config.js` and fill in the two blank strings:

```js
window.PORTFOLIO_SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
window.PORTFOLIO_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_YOUR_KEY';
```

These values are intended for browser use. Database security must be enforced by Row Level Security.

## 2. Set up an admin account and secure database access

1. In Supabase, open **Authentication → Users** and create your login user.
2. Open **SQL Editor**, paste and run `supabase/github-pages-security.sql`.
3. Copy the user UUID from **Authentication → Users**. Run the final `insert into public.portfolio_admins...` statement at the bottom of that SQL file after replacing the placeholder UUID.
4. If you already ran `supabase/schema.sql` from the Next.js starter, the `projects` table and seed projects already exist. If not, run `supabase/schema.sql` first, then run the security SQL.
5. Open `admin.html` on the deployed site, sign in, and test creating/editing/unpublishing a project.

The security SQL removes the starter policies that allowed any authenticated account to edit the projects table and restricts edits to the user explicitly listed in `portfolio_admins`.

## 3. Test before publishing

Open `index.html` locally, or use a simple static server. Because browsers can restrict local-file requests, the easiest test is to commit to a temporary branch or use VS Code Live Server. Verify:

- Homepage looks correct and all local images load.
- `admin.html` login works.
- Admin can add/edit/publish/unpublish/delete projects.
- Signed-out visitors can read only published projects.

## 4. Publish while keeping the current URL

1. Keep the existing repository `vidx0/My_Portfolio`.
2. Upload/commit these updated files to the branch and folder currently configured in **Settings → Pages** (usually `main` / root).
3. Keep the existing `CNAME` file unchanged if you still use its custom domain.
4. Wait for GitHub Pages to deploy. The existing `https://vidx0.github.io/My_Portfolio/` URL remains the same.

Once Supabase is configured, project content is fetched at runtime from the database. New project entries won't require a GitHub commit. Changes to the design/code still require a commit and Pages deployment.

## Notes

- `admin.html` is not secret by itself; access control is enforced by Supabase Auth + RLS.
- Never put a service-role key in `supabase-config.js` or any public file.
- GitHub Pages is static hosting. This edition intentionally avoids Next.js server routes. The separate Next.js/Vercel edition can be used for the later migration.
