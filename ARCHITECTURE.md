# Architecture Notes

## Overview

CollabWrite is a monorepo with two main parts: a React single-page app (client) and a Node.js REST API (server). They run as separate processes in development and can be deployed together in production.

```
Browser  ──>  React SPA (Vite)  ──>  Express API  ──>  SQLite
                 :5173                  :3001            collabwrite.db
```

## Key Decisions

### Why TipTap over other editors?

I evaluated a few options for the rich-text editor:

- **Draft.js** — Facebook's editor. Mature but heavy, React-specific API feels dated. Documentation is decent but the project seems stagnant.
- **Quill** — Popular, easy to set up, but customization gets painful. The delta format is its own thing and doesn't play well with HTML persistence.
- **Slate.js** — Very flexible but essentially requires you to build the editor from scratch. Too much work for this timebox.
- **TipTap** — Built on ProseMirror (the gold standard for rich-text editing). Modern React integration, great extension system, outputs clean HTML. The starter kit covers all the formatting we need out of the box.

TipTap won because it gave me the best balance of functionality, developer experience, and time-to-working-product. The extension architecture also means I could easily add features like collaboration or comments later.

### Why SQLite?

For this scope, SQLite is the right call:
- Zero configuration — no database server to install or manage
- File-based — easy to deploy, easy to inspect, easy to back up
- The dataset is small (documents + users + shares) and there's no concurrent write pressure
- `better-sqlite3` is synchronous, which actually simplifies the Express route handlers — no need for connection pools or async query patterns

The main tradeoff is that SQLite doesn't support concurrent writers well, so this wouldn't scale to a multi-server deployment. That's a known, documented limitation — and in a real product I'd switch to Postgres.

### Why session-based auth with demo users?

The assignment asks to "simulate users with seeded accounts" — so I took the simplest approach that still demonstrates the sharing model clearly:

- Three pre-seeded users (Alice, Bob, Charlie)
- Username-only login (no passwords)
- Server-side sessions via `express-session`

This keeps the auth surface area minimal while still enabling the full sharing flow. In a real product, I'd integrate an identity provider (Auth0, Clerk, or roll my own with bcrypt + JWT).

### Auto-save strategy

Rather than a manual "Save" button, documents auto-save 2 seconds after the user stops typing. This feels natural (like Google Docs) and avoids the anxiety of "did I save?"

The debounce approach:
1. User types → `onUpdate` fires from TipTap
2. Reset a 2-second timer
3. When the timer fires, send a PUT request with the current content
4. UI shows "Saving..." then "Saved ✓"

I also save version snapshots, but throttle them to one per 5-minute window to avoid filling the versions table with noise.

### Sharing model

I kept this deliberately simple:

| Role | Read | Edit | Delete | Manage shares |
|------|------|------|--------|---------------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✗ | ✗ |
| Viewer | ✓ | ✗ | ✗ | ✗ |

Sharing is done by username (since we don't have email). The owner can share with any other user and set their permission level. Shared documents show up in a separate "Shared with Me" section on the dashboard.

This is intentionally not an ACL system. A production version would probably use role-based access with team/org scoping, but that's way beyond this timebox.

### Document content storage

Documents are stored as HTML strings in SQLite. TipTap outputs HTML natively, so this is the most natural format — no conversion needed on save or load.

Alternatives I considered:
- **ProseMirror JSON** — TipTap's internal format. More precise but harder to debug and doesn't render outside the editor.
- **Markdown** — Nice for portability but lossy for rich formatting (can't represent all TipTap features).
- **Delta (Quill format)** — Proprietary, not useful outside Quill.

HTML won because it's portable, debuggable (I can inspect documents directly in the DB), and TipTap handles it natively in both directions.

### File upload architecture

File upload converts incoming files to HTML and creates a new document:

```
.txt  ──>  wrap in <p> tags  ──>  new document
.md   ──>  marked (MD→HTML)  ──>  new document
.docx ──>  mammoth (→HTML)   ──>  new document
```

I used memory storage (Multer) rather than disk storage since we immediately process the file and don't need to keep the original. The converted HTML goes into a new document — the user can then edit it like any other doc.

## What I'd architect differently at scale

1. **Database**: Postgres with proper migrations (using Knex or Prisma)
2. **Auth**: OAuth + JWT, with refresh tokens
3. **Real-time**: WebSocket server (Socket.io or native WS) for live collaboration, backed by Yjs or Automerge CRDTs
4. **File storage**: S3 for uploaded files and document attachments
5. **Search**: Full-text search index (Postgres full-text or Elasticsearch)
6. **Caching**: Redis for session storage and document access checks
7. **API**: Move from REST to a mix of REST + WebSocket events
8. **Deployment**: Containerized with Docker, orchestrated with Kubernetes or ECS
