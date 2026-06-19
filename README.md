# CollabWrite

A lightweight collaborative document editor built as a full-stack web application. Inspired by Google Docs, scoped for practical use — create, edit, share, and manage rich-text documents in the browser.

![CollabWrite](https://img.shields.io/badge/status-working-green) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue) ![License](https://img.shields.io/badge/license-MIT-gray)

**Live Demo:** https://collabwrite-bcsw.onrender.com  
**GitHub:** https://github.com/CodeCrafter0910/CollabWrite

---

## Features

- **Rich-text editing** — Bold, italic, underline, headings (H1–H3), bullet/ordered lists via TipTap
- **Auto-save** — Changes persist automatically 2 seconds after you stop typing
- **Document management** — Create, rename, delete documents from a clean dashboard
- **File upload** — Import `.txt`, `.md`, or `.docx` files as new editable documents
- **Sharing** — Share documents with other users as viewer (read-only) or editor
- **Version history** — Browse and restore previous versions of any document
- **Dark mode UI** — Professional, distraction-free editing environment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Editor | TipTap (ProseMirror) |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | Session-based (demo users) |
| Styling | Vanilla CSS, dark theme |

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9

### Setup

```bash
# Clone and enter the project
cd CollabWrite

# Install all dependencies (server + client)
npm run install:all

# Also install root dev dependencies
npm install
```

### Development

```bash
# Start both server and client in dev mode
npm run dev
```

This runs:
- **API server** on `http://localhost:3001`
- **React dev server** on `http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build the frontend
npm run build

# Start the production server (serves the built frontend too)
NODE_ENV=production npm start
```

Then visit `http://localhost:3001`.

## Demo Users

The app comes with three pre-seeded accounts for testing:

| Username | Display Name |
|----------|-------------|
| `alice` | Alice Johnson |
| `bob` | Bob Smith |
| `charlie` | Charlie Davis |

No passwords — just pick a user on the login screen. This keeps the focus on the editing and sharing flows rather than auth infrastructure.

### Testing the Sharing Flow

1. Log in as **Alice** and create a document
2. Click the **Share** button in the editor
3. Share with `bob` (as editor) and `charlie` (as viewer)
4. Log out → Log in as **Bob** → You'll see the doc under "Shared with Me" and can edit it
5. Log out → Log in as **Charlie** → Same doc appears but in read-only mode

## File Upload

Supported formats:
- `.txt` — Plain text, converted to simple HTML paragraphs
- `.md` — Markdown, converted to HTML via `marked`
- `.docx` — Word documents, converted via `mammoth.js`

Max file size: **5 MB**

## Project Structure

```
CollabWrite/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   ├── utils/           # API client, helpers
│   │   ├── App.jsx          # Root component with routing
│   │   └── index.css        # Global styles & design system
│   └── index.html
├── server/                  # Express API server
│   ├── routes/              # API route handlers
│   ├── middleware/          # Auth & access control
│   ├── tests/               # API tests (Vitest + Supertest)
│   ├── db.js                # SQLite setup & seed data
│   └── server.js            # Express app entry point
├── ARCHITECTURE.md          # Technical decisions & tradeoffs
├── AI_WORKFLOW.md           # AI tool usage notes
└── SUBMISSION.md            # Deliverables list
```

## Running Tests

```bash
npm test
```

Runs the API test suite using Vitest + Supertest. Tests cover:
- Authentication flow
- Document CRUD operations
- Sharing permission enforcement
- File upload processing

## Known Limitations & Intentional Scope Cuts

- **No real authentication** — Uses demo accounts with session-based login. A production app would use OAuth or JWT.
- **No real-time collaboration** — Documents don't sync live between users. This would need WebSockets/CRDTs (out of scope for this timebox).
- **No image/media in documents** — TipTap supports this but it adds complexity around storage and rendering.
- **Single-server deployment** — SQLite doesn't scale horizontally. A production version would use Postgres.
- **No email notifications** — Sharing is silent; in a real product you'd notify users when documents are shared with them.

## What I'd Build Next (2–4 More Hours)

1. **Real-time presence** — Show who else is viewing/editing a document (WebSocket-based)
2. **Comments** — Inline commenting with @mentions
3. **Export** — PDF and Markdown export from the editor
4. **Search** — Full-text search across all accessible documents
5. **Proper auth** — OAuth with Google/GitHub login

## License

MIT
