# AI Workflow Notes

## Tools Used

- **GitHub Copilot** (VS Code extension) — Inline code suggestions while writing
- **ChatGPT (GPT-4)** — Occasional reference for API design patterns and CSS troubleshooting
- **Copilot Chat** — Quick questions about library APIs (TipTap, mammoth.js)

## Where AI Materially Sped Up My Work

### Boilerplate and scaffolding
The biggest time savings came from AI-assisted scaffolding. Setting up Express routes, middleware patterns, and React component shells is repetitive work I've done many times. Copilot autocompleted most of this correctly, which probably saved 30–45 minutes of typing.

### CSS authoring
The dark theme CSS was significantly faster with AI assistance. I described the general aesthetic I wanted (dark productivity app, similar to Linear/Notion) and used suggestions as a starting point, then tuned colors, spacing, and animations by hand. Writing 600+ lines of CSS from scratch would have taken much longer.

### TipTap integration
I hadn't used TipTap before this project — I'd previously worked with Quill and Draft.js. AI helped me get up to speed on TipTap's API quickly, especially the extension system and the React integration hooks. I still read the official docs to understand the architecture, but AI-generated examples helped me write the toolbar and editor setup faster.

### Test structure
AI generated the initial test file structure and assertions. I modified the test cases to cover edge cases I cared about (permission enforcement, invalid inputs) and fixed a couple of assertions that didn't match my actual API responses.

## What I Changed or Rejected

### Rejected: AI-suggested complex auth system
Copilot kept trying to generate a full JWT auth system with bcrypt password hashing. I rejected this because it's overkill for demo users and would eat into time I needed for the core editing features. I went with simple session-based username login instead.

### Modified: Database schema
Initial AI suggestion used UUIDs for primary keys. I changed to auto-incrementing integers because SQLite handles them more efficiently and they're easier to work with in a demo context. Also added the `document_versions` table which wasn't in the initial suggestion.

### Modified: File upload error handling
AI-generated upload handler didn't properly handle the case where mammoth fails on a corrupted .docx file. I added try-catch around each conversion path with specific error messages.

### Rejected: Over-engineered component library
Copilot suggested creating a full design system with a Button component, Input component, etc. For this scope, utility CSS classes are more pragmatic. I don't need the abstraction overhead of a component library for an app with 4 pages.

### Modified: CSS styling
AI-generated styles were functional but bland. I spent time manually adjusting the color palette, adding subtle animations, improving spacing, and making the editor feel more polished. The design went through several manual iterations before I was happy with it.

## How I Verified Correctness

### Functional testing
- Ran the automated test suite (Vitest + Supertest) after building each route
- Manually tested every user flow: login → create doc → edit → save → reload → verify
- Tested sharing flow across all three demo users
- Uploaded test files in each supported format and verified conversion quality

### UX review
- Used the app as each demo user to check the experience from different permission levels
- Verified read-only mode works correctly for viewers
- Checked that auto-save timing feels natural (not too aggressive, not too slow)
- Reviewed the responsive layout at different viewport sizes

### Code review
- Read through all AI-generated code before committing
- Checked SQL queries for injection vulnerabilities (all parameterized)
- Verified session handling and access control logic manually
- Ensured error responses are consistent and informative

## Summary

AI was most useful for accelerating routine coding tasks — boilerplate, CSS, and learning a new library's API. The architectural decisions, scope prioritization, UX details, and error handling refinements were primarily my own work. I estimate AI saved me about 1.5–2 hours on a ~5 hour project, mostly on things I know how to do but are slow to type out.
