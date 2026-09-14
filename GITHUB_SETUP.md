# Farasdanga — Setup via GitHub + Cloudflare Dashboard (No Command Line)

This path avoids PowerShell almost entirely. You'll do everything by clicking around on
github.com and dash.cloudflare.com in your browser. The only place you might still need to
paste text into a box (not a terminal — just a text box in the dashboard) is loading the
database schema, and even that's optional if you'd rather type it manually.

---

## Part 1 — Put the project on GitHub

### 1.1 Create a GitHub account (skip if you have one)
Go to **https://github.com/signup** and create a free account.

### 1.2 Create a new repository
1. Go to **https://github.com/new**
2. Repository name: `farasdanga` (or anything you like)
3. Set it to **Private** (recommended, since it'll contain your site's structure) or Public — either works
4. Leave everything else as default
5. Click **Create repository**

### 1.3 Upload the project files
1. On your new (empty) repository page, click **uploading an existing file** (a blue link in
   the middle of the page)
2. Unzip the project folder I gave you on your PC first, so you have a plain folder (not a
   .zip) containing `wrangler.toml`, `schema.sql`, `README.md`, a `public` folder, and a
   `worker` folder
3. Open that unzipped folder in File Explorer, select **everything inside it** (Ctrl+A), and
   drag it all into the GitHub upload page in your browser
4. Scroll down, click **Commit changes**

Your repository should now show the same file/folder structure as the zip.

---

## Part 2 — Create the database (Cloudflare Dashboard)

1. Go to **https://dash.cloudflare.com** and log in (or sign up if you haven't)
2. In the left sidebar, find **Workers & Pages** → click **D1 SQL Database** (it may just be
   listed as **D1** depending on your view)
3. Click **Create Database**
4. Name it exactly: `farasdanga-db`
5. Click **Create**
6. On the database's page, find and copy the **Database ID** shown near the top — you'll need
   it in the next step

### 2.1 Load the schema

Still on that database's page:
1. Click the **Console** tab
2. Open `schema.sql` from the project files (you can open it in Notepad, or view it directly
   on GitHub by clicking into the file)
3. Copy the **entire contents** of `schema.sql`
4. Paste it into the Console's query box on the Cloudflare dashboard
5. Click **Execute** (or **Run**)

You should see a success message. If anything says a table already exists, that's harmless.

### 2.2 Put the Database ID into your project (on GitHub, no download needed)

1. Go back to your GitHub repository in the browser
2. Click on `wrangler.toml`
3. Click the **pencil icon** (Edit this file) near the top right of the file view
4. Find this line:
   ```
   database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
   ```
5. Replace the text between the quotes with the Database ID you copied in step 2, so it looks like:
   ```
   database_id = "1a2b3c4d-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
   ```
6. Scroll down, click **Commit changes** (you can commit directly to the main branch)

---

## Part 3 — Connect Cloudflare to your GitHub repository

1. In the Cloudflare dashboard, go to **Workers & Pages**
2. Click **Create**
3. Choose **Workers**, then look for an option like **Connect to Git** / **Import a repository**
4. Authorize Cloudflare to access your GitHub account if prompted (it'll ask which repos to allow — choose the `farasdanga` repo, or "all repositories" if you're comfortable with that)
5. Select your `farasdanga` repository
6. Cloudflare should detect the `wrangler.toml` file automatically and show your project settings (name, bindings) pulled from it
7. Click **Save and Deploy** (or **Deploy**)

Cloudflare will now build and deploy your site. This takes a minute or two — you'll see a build
log on screen. When it finishes, it shows you a live URL like:
```
https://farasdanga-serve.<something>.workers.dev
```

From now on, **every time you push a change to the `main` branch on GitHub, Cloudflare automatically redeploys** — no commands needed.

---

## Part 4 — Set your admin password and (optionally) Razorpay keys

These must be set in the Cloudflare dashboard, **never** committed to GitHub, since anyone who
can see your repository could see them otherwise.

1. In the Cloudflare dashboard, go to **Workers & Pages** → click your `farasdanga-serve` Worker
2. Go to **Settings** → **Variables and Secrets** (naming may vary slightly, look for something
   about environment variables/secrets)
3. Click **Add** (or **Add variable**)
4. Name: `ADMIN_PASSWORD` — Value: choose a password — make sure it's marked as **Secret/Encrypt**
   (not plain text), so it isn't visible later
5. Click **Save** — it may ask you to redeploy for it to take effect; if so, click **Deploy**

**If you want paid ads working (optional, can do later):**
1. Sign up at https://dashboard.razorpay.com/signup
2. Get your **Key ID** and **Key Secret** from Settings → API Keys (use Test Mode keys while trying things out)
3. Back in the same Cloudflare Variables and Secrets screen, add two more secrets:
   - `RAZORPAY_KEY_ID` → paste your Key ID
   - `RAZORPAY_KEY_SECRET` → paste your Key Secret (mark as Secret/Encrypt)
4. Save and redeploy if prompted

---

## Part 5 — Try it out

1. Open your live URL from Part 3
2. Click a category — providers should filter
3. Click **Suggest a Provider**, fill it in, submit — should show a success message
4. Click **Admin Login** in the footer, enter the password from Part 4
5. In Admin → **Providers**, find your test suggestion as "pending," click **Approve** — it
   should now show on the live site
6. Try **Admin → Site Content** — change the homepage headline, save, then refresh the site to
   see it update instantly (this doesn't need a redeploy — it saves straight to the database)

---

## Making changes later (the GitHub way)

To edit any file (like `public/index.html`):
1. Go to the file on GitHub
2. Click the pencil icon to edit
3. Make your changes
4. Scroll down, click **Commit changes**
5. Cloudflare automatically rebuilds and redeploys within a minute or two — check the
   **Deployments** tab on your Worker in the Cloudflare dashboard to watch progress

No PowerShell, no `wrangler deploy`, ever, with this setup.

---

## If something doesn't match this guide

Cloudflare occasionally renames buttons or moves things around in their dashboard. If a step
doesn't look exactly like what's described:
- Look for wording close to what's described (e.g. "Variables and Secrets" might appear as
  "Environment Variables" — same thing)
- Take a screenshot of what you're seeing and send it to me — I'll tell you exactly where to
  click based on what's actually in front of you

## If you'd rather use the command line after all

The other README.md in this same project (the PowerShell/Wrangler version) still works fine and
does the exact same thing — the two approaches produce an identical live site. You can mix and
match too: for example, set up the database via the dashboard (Part 2 above) but still deploy
manually with `wrangler deploy` if you ever install the command-line tools later.
