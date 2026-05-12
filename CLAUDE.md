# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Serve /web directory at http://localhost:5000
```

There are no build, lint, or test steps — this is a static client-side app with no transpilation.

## Architecture

**Trello2day** is a read-only browser dashboard that aggregates Trello cards across all boards and presents them in five filtered views. All code lives in `web/js/`. There is no backend, no bundler, and no framework beyond jQuery 3.7.1 (bundled).

### Views and their modules

| Page | Module | What it shows |
|------|--------|---------------|
| `index.html` | `todo.js` | Cards with due dates, sorted by date |
| `inbox.html` | `inbox.js` | Cards from "Inbox" lists across all boards |
| `waiting.html` | `waiting.js` | Cards from "Waiting" lists across all boards |
| `backlog.html` | `backlog.js` | Card counts per board's "Backlog" list |
| `people.html` | `people.js` | Cards assigned to a team member (org-scoped) |

### Core modules

- **`config.js`** — Trello API key and constants (`noFutureDays`, `scrumPoints`, `ALERT_THRESHOLD`, `COL_INBOX`, `COL_WAITING`, `COL_BACKLOG`). This file is `.gitignore`d; each user creates their own.
- **`trello2day.js`** — All shared logic: Trello OAuth, board/list/card fetching, `renderCard()`, `loadCardsFromNamedList()`, sorting, date formatting, and board-color-to-text-contrast calculation.

### Data flow

Each page authorizes with Trello OAuth, fetches all boards, then calls page-specific logic to load lists/cards and render them. Async operations use jQuery Deferred (`$.when(...).then(...).fail(...)`).

Global objects (`board`, `list`, `scrum`, `listStatus`) cache API responses across the session.

### Card classification

Cards are styled by urgency via CSS classes: `latetask` (overdue), `todaytask` (due today), `futuretask` (due within `noFutureDays`). Board background colors are applied dynamically; text color (black/white) is computed from luminance.

### Scrum points

When `scrumPoints = 1`, card names are parsed with `SCRUM_POINTS_REGEX = /\(((([\d]+(.[\d])?)\/)?([\d]+(.[\d])?))\)/` to extract `(done/total)` point pairs.

## Configuration

`web/js/config.js` is not committed (gitignored). Users must create it with their Trello API key from https://trello.com/app-key:

```javascript
var trellokey = 'YOUR_API_KEY';
var noFutureDays = 7;
var scrumPoints = 1;
var ALERT_THRESHOLD = 10;
var BACKLOG_ALERT_THRESHOLD = 20;
var COL_INBOX = 'Inbox';
var COL_WAITING = 'Waiting';
var COL_BACKLOG = 'Backlog';
```
