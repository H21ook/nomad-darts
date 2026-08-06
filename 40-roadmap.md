# Roadmap

## Now (Goal 1: Offline + Guest)

### Must-have

- PWA config verify (production build дээр)
- Match state transitions:
  - leg дуусах → next leg
  - match дуусах → finished screen
  - rematch (хуучин тохиргоогоор)
- Full statistics page (at least basic)
- Resume feature:
  - Home дээр Resume CTA
  - Resume logic (active match snapshot)
  - Clear rules: ямар тохиолдолд resume боломжгүй болох вэ?
- UI consistency: дизайн системийг стандартчилах (basic)

### Nice-to-have

- Guest match history (local)
- Error states + edge cases (bust, finish validation)

## Next (Goal 2: Accounts)

- Supabase auth (sign up / login)
- Logged-in home/dashboard
- Match history sync (cloud)
- Personal stats dashboard (free)
- Paid tier definition (advanced stats)

## Later

### Goal 3: Tournaments

- Open/Closed tournaments, public/private views

### Goal 4: Clubs

- Club model + membership + billing idea

### Goal 5: Leaderboards

- Ranking model + multiple leaderboard types
