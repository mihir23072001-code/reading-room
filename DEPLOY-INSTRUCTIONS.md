# Getting the Reading Room live, with a real /admin

This folder is the whole site, rebuilt around a small content system: you publish from a
private `/admin` page, and the public site (homepage + archive pages) updates itself. No
database to manage, no server to keep running — it all rides on GitHub + Netlify, which are
both free for a site this size.

There are four one-time setup steps, then it's just "write, hit Publish."

## 1. Put this project on GitHub

1. Go to github.com, sign in (or create a free account), and create a **new repository** —
   name it something like `reading-room`. Keep it Private if you'd rather the source not be
   public (the live site itself will still be public either way).
2. On your own computer, unzip this project, open a terminal inside the folder, and run:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/reading-room.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your GitHub username. GitHub shows you these exact commands
   on the empty repo's page too.)

## 2. Connect it to Netlify

1. Go to netlify.com and sign up / log in — the free "Starter" plan is enough for this site.
2. Click **Add new site → Import an existing project**, choose GitHub, and pick the
   `reading-room` repo you just pushed.
3. Netlify will detect the settings from `netlify.toml` automatically:
   - Build command: `node build.js`
   - Publish directory: `.`
4. Click **Deploy**. After a minute or two you'll get a live URL like
   `https://something-random-123.netlify.app`.
5. Optional: in **Site configuration → Domain management**, click **Options → Edit site name**
   to pick a nicer subdomain (e.g. `mihir-reading-room.netlify.app`), or add a domain you own.

## 3. Turn on the admin login (Identity + Git Gateway)

This is what makes `/admin` a real, password-protected publishing tool instead of just a
static mockup.

1. In your Netlify site dashboard, go to **Site configuration → Identity** and click
   **Enable Identity**.
2. Under **Identity → Registration**, set it to **Invite only** (so strangers can't sign
   themselves up).
3. Under **Identity → Services**, enable **Git Gateway**. This is the piece that lets the
   admin page commit your changes straight to the GitHub repo on your behalf.
4. Go to the **Identity** tab and click **Invite users** — invite your own email address
   (panchalmihir2911@gmail.com). You'll get an email with a link to set a password.
5. Open **your-site-url.netlify.app/admin/**, click the link from the invite email (or just
   log in with the password you set), and you're in.

One small edit before that first login: open `admin/config.yml` in the repo and replace the
two placeholder lines near the top —

```yaml
site_url: https://your-site-name.netlify.app
display_url: https://your-site-name.netlify.app
```

— with your actual Netlify URL from step 2, then commit and push that change (or edit it
directly on GitHub's website, which also works and triggers a redeploy).

## 4. Publishing from now on

Once logged into `/admin`, you'll see three sections: **Writings** (long-form essays),
**Thoughts**, and **Books**.

Thoughts is deliberately kept to four fields — publishing one takes seconds:

1. **Title** — the thought, question or observation itself.
2. **Description** — the longer line underneath it.
3. **Image** — upload one; you'll see a preview before you publish.
4. **Date** — optional. Controls where the entry sits in the Journal (newest first). Leave it
   blank and it defaults to whenever you first publish the entry.

You can come back to any Thought later and edit its title, description, image or date, or
delete it outright — nothing is locked in after publishing.

Books is even smaller — two fields, nothing else:

1. **Book name** — plain text.
2. **Book image** — the cover; this is the only thing shown.

Click **Publish** (or **Save** then **Publish**, depending on the button shown) and it
triggers a new build automatically — usually live within 1–2 minutes. A new Thought appears
as the next entry in the homepage's vertical Journal and in the `/thoughts.html` archive;
a new Book joins the marquee in the Shelf section. Neither needs any other step — nothing
to reorder, no frontend file to touch.

- **Published** toggle (Thoughts and Writings only — Books has no toggle, by design):
  flip it off and publish again to pull an entry down without deleting it. **Delete** removes
  an entry outright, in any of the three sections.
- Thoughts sort newest-first by the Date field above; Books sort newest-first automatically
  with no ordering field to think about — "newest" is read from git's own commit history for
  that file (Netlify's build sees the full history once this is pushed to GitHub), so the
  moment you publish a Book is what decides its order.
- The Shelf splits every published book across two rows that scroll past in opposite
  directions — a plain, lightweight CSS marquee rather than an animated 3D corridor, so it
  runs just as smoothly on a phone as on a desktop. Every published book is on screen in the
  loop; there's no cap and nothing to trim as you add more.
- Writings keeps its own fields (Category, Excerpt, Date, Body, Featured) exactly as before —
  none of today's changes touched Writings. Note the **Featured** checkbox on Writings is
  currently unused by the homepage (the Featured Writings teaser section was removed from the
  homepage per a later revision) — it's harmless to leave as-is, just doesn't drive anything
  visible right now.
- The Writings body field takes plain text with two small conventions: a blank line starts a
  new paragraph, and a line starting with `## ` becomes a sub-heading. For the one essay that
  uses a data table (Gold ⇄ Milk), a plain markdown table (`| col | col |` rows) renders as a
  proper table.

That's the whole loop: write in `/admin`, hit Publish, it's live.

## What's already seeded

- All six entries from your journal are seeded into **Thoughts** — the exact title and the
  full, verbatim text of each, nothing condensed or reworded. Three of these (Exploring
  Monotheism, Is "I" Creation?, Gold ⇄ Milk) also have their own dedicated pages in
  **Writings**, since they were originally written as longer essays; they now live in both
  places by design, so the Journal on the homepage is the one spot with all six, and the three
  bigger ones additionally get a standalone page under Writings.
- Each seeded Thought uses the actual illustration from your journal — pulled straight out of
  the source PDF and matched to its entry — rather than a site painting standing in for it.
  They live in `renaissance-assets/img/journal-covers/`; swap any of them from Admin → Thoughts
  → Image whenever you like.
- The Gold ⇄ Milk entry under Thoughts keeps its headings and comparison table — the
  description field supports the same light markdown as Writings (`## Heading` and pipe
  tables), so longer entries don't have to be flattened to plain paragraphs.
- **Books** is seeded with 19 titles from your own reading list, with real cover art — mostly
  hotlinked from Open Library's public covers API (a free, purpose-built service; no image
  files to manage for those), plus two you sent directly (Kasap, Deewar Mein Ek Khidki Rehti
  Thi) which are saved locally in `renaissance-assets/img/book-covers/` so they don't depend on
  any outside service. Add, edit, or remove books any time from Admin → Books — two fields,
  nothing else.

## A few honest notes

- The homepage's Journal is driven by one JSON file (`thoughts.json`) that `/admin` writes
  to — nothing on the public site is hand-typed, so a new entry appears without touching any
  code. It's a plain vertical list (no pinned or horizontal-scrolling sections anywhere on the
  site anymore), so it reads the same way on a phone as it does on a desktop.
- If you ever want to skip Netlify's build step entirely and just check your changes locally,
  run `node build.js` from inside the project folder (no install needed — it only uses
  Node's built-in tools) and open `index.html` with a local server (e.g. `python3 -m http.server`,
  then visit `localhost:8000`). Opening `index.html` directly by double-click won't work for the
  homepage's dynamic sections, since browsers block `fetch()` of local files without a server.
  Before this project has been pushed to GitHub, there's no git history yet for `build.js` to
  read a Thought's publish date from, so locally it falls back to the content file's own save
  time — accurate, just not identical to the real commit time you'll get once this is live on
  Netlify.
- The recurring 3D abstract object from your brief is still not in this build — it's waiting
  on your answer to the visual-direction question asked alongside an earlier delivery. Once
  that's settled it needs its own follow-up pass; nothing about today's structure should need
  to change to accommodate it.
