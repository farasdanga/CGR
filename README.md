# Farasdanga — Complete Setup Guide (Start to Finish)

This guide assumes your PC has **nothing installed yet** — no Node.js, no Wrangler, nothing. Follow
every step in order, top to bottom, and copy-paste each command exactly as written. This is written
for Windows (PowerShell), since that's what you're using — Mac/Linux steps are nearly identical if
you ever need them.

A note on what I can and can't do: I can't remotely access or control your computer — I only run in
my own separate environment and have no way to see your screen or type on your keyboard. Everything
below is written so you can do it yourself by copying each command. If something doesn't match what
this guide says it should show, take a screenshot and send it to me — I'll tell you exactly what to
do next.

---

## Part 1 — Install the tools (one-time only)

### 1.1 Install Node.js

1. Go to **https://nodejs.org**
2. Click the button that says **LTS** (it will say something like "20.x.x LTS") — this downloads an installer
3. Run the downloaded file, click Next through the installer accepting the defaults, then Finish
4. **Restart PowerShell** (close it completely and open it again — this matters, Windows won't see the new install otherwise)
5. Check it worked by typing:
   ```
   node -v
   ```
   You should see something like `v20.11.0`. If you see an error instead, restart your computer and try again.

### 1.2 Install Wrangler (Cloudflare's command-line tool)

In PowerShell, run:
```
npm install -g wrangler
```
This takes a minute. When it finishes, check it worked:
```
wrangler --version
```
You should see something like `⛅️ wrangler 4.x.x`.

### 1.3 Create a Cloudflare account (if you don't have one)

1. Go to **https://dash.cloudflare.com/sign-up**
2. Sign up with your email (free plan is all you need)
3. Verify your email if it asks you to

### 1.4 Log in to Cloudflare from your PC

```
wrangler login
```
This opens your web browser asking you to approve access. Click **Allow**. Come back to PowerShell —
it should say something like "Successfully logged in."

---

## Part 2 — Get the project files onto your PC

1. Unzip the project folder I've given you somewhere easy to find, for example:
   ```
   C:\Users\<your-username>\Desktop\farasdanga
   ```
2. Open PowerShell and navigate into that folder:
   ```
   cd C:\Users\<your-username>\Desktop\farasdanga
   ```
   (Replace `<your-username>` with your actual Windows username. Tip: you can type `cd ` with a
   trailing space, then drag the folder from File Explorer into the PowerShell window, and it will
   fill in the path for you.)
3. Confirm you're in the right place:
   ```
   dir
   ```
   You should see `wrangler.toml`, `schema.sql`, `README.md`, a `public` folder, and a `worker` folder.

---

## Part 3 — Set up the database (Cloudflare D1)

### 3.1 Create the database

```
wrangler d1 create farasdanga-db
```

**If this succeeds**, it prints something like:
```
✅ Successfully created DB 'farasdanga-db'

[[d1_databases]]
binding = "DB"
database_name = "farasdanga-db"
database_id = "1a2b3c4d-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```
Copy that long `database_id` value — you need it in the next step.

**If it says "A database with that name already exists"**, that's fine — it means you already made
one before. Just run this instead to find its ID:
```
wrangler d1 list
```
Find `farasdanga-db` in the list and copy its `database_id`.

### 3.2 Put the database ID into your project

1. Open the `wrangler.toml` file from the project folder in Notepad:
   ```
   notepad wrangler.toml
   ```
2. Find this line:
   ```
   database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
   ```
3. Replace the text between the quotes with the ID you copied. It should look like:
   ```
   database_id = "1a2b3c4d-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
   ```
4. Save the file (Ctrl+S) and close Notepad.

### 3.3 Load the database structure

Back in PowerShell (still inside your project folder):
```
wrangler d1 execute farasdanga-db --remote --file=./schema.sql
```
You should see a success message listing several queries executed. If it mentions a table already
existing, that's harmless — it just means part of this was already set up.

---

## Part 4 — Set your admin password

This is the password you'll type into "Admin Login" on the live website.

```
wrangler secret put ADMIN_PASSWORD
```
It will prompt you to type a password — type one (you won't see it appear as you type, that's
normal for passwords) and press Enter.

---

## Part 5 — (Optional) Set up Razorpay for paid ads

Skip this whole part if you just want the free directory live first — you can always come back and
do this later. Nothing else on the site needs it.

1. Sign up at **https://dashboard.razorpay.com/signup**
2. Go to **Settings → API Keys** and generate a key pair. While testing, use the **Test Mode** toggle
   (top right of their dashboard) so no real money moves.
3. Set the two secrets:
   ```
   wrangler secret put RAZORPAY_KEY_ID
   ```
   Paste the Key ID when prompted, press Enter.
   ```
   wrangler secret put RAZORPAY_KEY_SECRET
   ```
   Paste the Key Secret when prompted, press Enter.
4. When you're ready to accept real payments, complete Razorpay's KYC and switch to Live Mode keys,
   then repeat step 3 with the live keys to replace the test ones.

---

## Part 6 — Deploy the website

```
wrangler deploy
```

If everything above was done correctly, you'll see a URL printed near the bottom, like:
```
https://farasdanga-serve.<something>.workers.dev
```

**Open that URL in your browser** — your site should load, showing the homepage with categories and
providers.

### If you see an error here

- **"R2 bucket not found"** — you don't need R2 for this version at all. If you see this error, it
  means you're running an older version of the project. Make sure you unzipped the newest zip file
  I gave you (the one with this README in it) and are running commands from that folder.
- **"D1_ERROR: no such table"** — go back to Part 3.3 and run the schema command again.
- **Any other error** — copy the full red error text and send it to me as a screenshot; I'll tell
  you exactly what it means and what to run next.

---

## Part 7 — Try it out

1. Visit your site URL. You should see the homepage with the illustrated river scene, categories,
   and the sample providers already loaded from the schema.
2. Click a category — it should filter the providers shown.
3. Click "Suggest a Provider" — fill it in and submit. It should show a success message.
4. Click "Admin Login" in the footer, type the password you set in Part 4, and log in.
5. In the Admin panel, go to **Providers** — you should see your test suggestion sitting there as
   "pending." Click **Approve** — it should now appear on the live site.
6. Explore **Categories** and **Site Content** — try changing the homepage headline and saving, then
   go back to the site and refresh to see it change instantly.

---

## Making changes later

Any time you edit `public/index.html`, `worker/index.js`, or `schema.sql`, save the file, then from
the project folder run:
```
wrangler deploy
```
to push the update live. Content changes made from the **Admin → Site Content** tab don't need a
redeploy at all — those save straight to the database and show up immediately.

## Quick command reference

| What you want to do | Command |
|---|---|
| See your database ID again | `wrangler d1 list` |
| Reload the schema (safe to re-run) | `wrangler d1 execute farasdanga-db --remote --file=./schema.sql` |
| Change the admin password | `wrangler secret put ADMIN_PASSWORD` |
| Add/replace Razorpay keys | `wrangler secret put RAZORPAY_KEY_ID` / `wrangler secret put RAZORPAY_KEY_SECRET` |
| Push any file changes live | `wrangler deploy` |
| Check you're logged into the right Cloudflare account | `wrangler whoami` |

## If you get stuck at any step

Take a screenshot of exactly what you see in PowerShell (the full window, including the command you
typed) and send it over. Tell me which numbered step you were on. I'll walk you through it from
there — there's no step in this guide that can't be fixed.
