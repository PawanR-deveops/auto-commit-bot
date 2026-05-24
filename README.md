# auto-commit-bot

Automatically creates backdated GitHub commits to build a realistic contribution graph. Runs every 2 days via GitHub Actions.

---

## Why This Exists

GitHub's contribution graph shows activity from your account creation date onwards. This bot fills that history with natural-looking commit activity — scattered green boxes with realistic gaps, not a suspiciously perfect every-day streak.

---

## How It Works — Full Logic

### Files

| File | Purpose |
|---|---|
| `commit-bot.js` | Main bot logic |
| `committed_dates.json` | Tracker — list of all dates already committed |
| `data.json` | The file that gets modified for each backdated commit |
| `.github/workflows/commit-bot.yml` | GitHub Actions — runs every 2 days |

---

### Algorithm (commit-bot.js)

**Step 1 — Load committed history**

Reads `committed_dates.json` (an array of `YYYY-MM-DD` strings) to know what dates already have commits.

**Step 2 — Find the next date to commit**

Walks through the full timeline from **account creation (Aug 26, 2024)** to **today**, looking for the first gap that is too large:

```
cursor = Aug 26, 2024

for each already-committed date (sorted):
    gap = committed_date - cursor (in days)

    if gap > 16 days:
        → gap is too big, need to fill it
        → pick: cursor + random(3 to 16) days
        → that is the next commit date
        → stop

    else:
        → gap is fine, move cursor forward

if no gap found (all commits are well-spaced):
    → extend from the last committed date
    → pick: last_date + random(3 to 16) days
```

This ensures history is filled **from the beginning** (Aug 2024 → today), not just from the most recent commit. Big gaps in the past are filled before new dates are added.

**Step 3 — Validate the date**

- If the chosen date is **after today** → skip (can't commit to the future)
- If the chosen date is **before Aug 26, 2024** → skip (before account creation)
- If already committed → skip

**Step 4 — Make the backdated commit**

Uses `simple-git`'s `--date` flag to backdate the commit:

```js
git.commit(`Commit for ${dateStr}`, { '--date': dateTime })
```

The commit timestamp is randomized between 9 AM–7 PM on that date to look natural.

Makes **1 or 2 commits** per date (random) — some days have a single commit, some have two, like a real developer.

**Step 5 — Update tracker and push**

- Adds the new date to `committed_dates.json`
- Commits the tracker file too (so next run knows this date is done)
- Pushes everything to GitHub

---

### Gap Logic Visualised

```
Timeline: Aug 26 2024 ──────────────────────────── Today (May 2026)

After several runs:
  Sep 05  →  Sep 18  →  Oct 02  →  Oct 14  →  Nov 01  →  Nov 17 ...
  (+10)       (+13)       (+14)       (+12)       (+18→filled) ...

Result on graph:
  ■ · · · · · · · · · ■ · · · · · · · · · · · ■ · · · · · · · · · ■
```

Never consecutive days. Never a suspicious daily streak. Gaps range 3–16 days.

---

### Schedule

```yaml
cron: '0 10 */2 * *'   # Every 2 days at 10 AM UTC
```

Each run adds one new backdated date. Since the bot runs every 2 days and each run adds ~1 date covering a 3–16 day gap, the full history from Aug 2024 → today fills up gradually over a few months.

Once history is fully caught up, the bot automatically starts filling dates closer to the present.

---

### Why data.json?

`data.json` is modified on every backdated commit — its content is just `{"date": "<timestamp>"}`. Git needs a file change to create a commit, and this is the file used for that purpose. The actual content doesn't matter.

---

### Never Expires

GitHub disables scheduled workflows after 60 days of repo inactivity. Since this bot commits `committed_dates.json` and `data.json` on every run, the repo is always active — the workflow will never be auto-disabled.

---

## Setup

1. Fork or clone this repo
2. Go to **Settings → Actions → General** → ensure Actions are enabled
3. Go to **Settings → Actions → General** → set **Workflow permissions** to "Read and write"
4. The workflow uses `GITHUB_TOKEN` (built-in, no secrets needed)
5. Set your Git identity in the workflow if you fork:
   ```yaml
   git config user.name "YourUsername"
   git config user.email "your@email.com"
   ```
   The commit author email **must match** your GitHub account email for commits to appear on your contribution graph.

6. Enable **"Show private contributions on profile"** in GitHub Settings → Profile if this repo is private.

---

## Tech Stack

- **Node.js 20**
- **simple-git** — git operations from JS
- **moment.js** — date arithmetic
- **jsonfile** — read/write JSON tracker
- **GitHub Actions** — scheduling and execution