# auto-commit-bot

Automatically creates backdated GitHub commits to maintain a natural-looking contribution graph.

## How it works

- Runs every 2 days via GitHub Actions
- Picks the next date that needs a commit (3–16 day gaps between commits)
- Only commits dates between account creation (Aug 26, 2024) and today
- Tracks committed dates so no duplicates

## Result

A realistic contribution graph — scattered green boxes with natural gaps, never continuous streaks.