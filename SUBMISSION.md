# CollabWrite - Submission Document

Hey! Thanks for checking out my project. I spent about 5-6 hours building this collaborative document editor, and I'm pretty happy with how it turned out. Here's everything you need to know.

## What I Built

I created a web-based document editor where people can write, format text, share docs with others, and even upload files to turn them into editable documents. Think Google Docs, but way simpler and more focused.

The app has:
- A clean dashboard where you see your documents and ones shared with you
- A rich text editor with formatting tools (bold, italic, headings, lists, etc.)
- Auto-save that kicks in a couple seconds after you stop typing
- File uploads for .txt, .md, and .docx files
- Document sharing with two permission levels (viewer and editor)
- Version history so you can go back to earlier versions if needed

## Tech Stack I Used

**Frontend:**
- React with Vite (fast dev experience)
- TipTap for the editor (it's built on ProseMirror which is solid)
- Custom CSS for styling (went with a dark theme)

**Backend:**
- Node.js + Express for the API
- SQLite for the database (simple, no setup needed)
- Session-based auth with demo users

I picked these because they let me move fast while still building something production-quality.

## What's Included in This Submission

✅ **Source Code** - https://github.com/CodeCrafter0910/CollabWrite  
✅ **README.md** - Setup instructions and project overview  
✅ **ARCHITECTURE.md** - My technical decisions and why I made them  
✅ **AI_WORKFLOW.md** - How I used AI tools and what I learned  
✅ **Tests** - API test suite with 18+ tests covering the main flows  
✅ **Live URL** - https://collabwrite-bcsw.onrender.com  
✅ **Video Walkthrough** - https://www.loom.com/share/f0084778ef9e4763848d256c27abe095  

## How to Test It

The app comes with three demo users already set up:
- **alice** (Alice Johnson)
- **bob** (Bob Smith)  
- **charlie** (Charlie Davis)

No passwords needed - just click on a user to log in.

**To test the sharing feature:**
1. Log in as Alice
2. Create a new document
3. Click the "Share" button
4. Share it with "bob" as an editor
5. Log out and log back in as Bob
6. You'll see Alice's document in "Shared with Me"
7. You can edit it!
8. Now log in as Charlie - you won't see the document at all

**To test file upload:**
1. Click "Upload File" on the dashboard
2. Drop in a .txt, .md, or .docx file
3. It'll create a new document with that content converted to HTML
4. You can then edit it like any other document

## What Works Really Well

I'm particularly proud of:
- The auto-save feature - it feels natural and you never worry about losing work
- Permission enforcement - it actually checks on the backend, not just hiding buttons
- Version history - this was a stretch goal but I got it done
- The UI design - spent time making it feel polished and professional
- File upload conversion - handles three different formats smoothly

All the core requirements are done:
- ✅ Document creation and editing
- ✅ Rich text formatting (bold, italic, underline, headings, lists)
- ✅ File upload with format conversion
- ✅ Sharing with permission levels
- ✅ Data persistence
- ✅ Automated tests
- ✅ Clear documentation

Plus I added version history as a bonus feature.

## What I Deliberately Left Out

Some things I didn't build because they would've blown the time budget:

**Real-time collaboration** - This would need WebSockets or a CRDT library like Yjs. Really cool feature but it's a whole project on its own.

**Email notifications** - When you share a doc, the other person doesn't get notified. In a real app you'd send an email, but I didn't want to deal with email service setup for a demo.

**Images and media** - The editor supports text formatting but not embedded images. TipTap can do this, but it adds complexity around file storage.

**Mobile optimization** - It's responsive and works on mobile, but I optimized for desktop use since that's where people typically edit documents.

## My Process and Decisions

### Why I Chose TipTap

I looked at a few editor options (Quill, Draft.js, Slate) but went with TipTap because:
- It's built on ProseMirror which is battle-tested
- The API is really clean and React-friendly
- It outputs HTML which makes persistence simple
- The extension system means I could add features later

### Why SQLite

For this scope, SQLite made perfect sense:
- No database server to set up
- Everything in one file
- Easy to inspect and debug
- Fast enough for the data size

I know it wouldn't work for a multi-server deployment, but that's fine for this demo. If this were production I'd switch to Postgres.

### Auto-save Strategy

Instead of a "Save" button, I went with auto-save that triggers 2 seconds after you stop typing. This matches what people expect from modern editors and removes anxiety about losing work.

I also save version snapshots, but I throttle them to once per 5 minutes so the versions table doesn't get cluttered.

### How I Used AI

I was honest about AI usage in my AI_WORKFLOW.md doc, but here's the quick version:

**Where AI helped a lot:**
- Writing boilerplate code (Express routes, React components)
- CSS styling for the dark theme
- Learning TipTap's API quickly
- Initial test structure

**Where I had to take over:**
- Architecture decisions (SQLite vs Postgres, session auth vs JWT)
- UX details (auto-save timing, permission model)
- Error handling edge cases
- Making the design feel polished

AI probably saved me 1.5-2 hours on a 5 hour project. Most of that was typing speed on stuff I already knew how to do.

## Testing

I wrote automated tests for:
- Authentication flow
- Creating, reading, updating, deleting documents
- Sharing and permission enforcement
- File upload processing
- Version history restore

Run them with `npm test` from the root directory. Everything passes.

I also manually tested all the user flows multiple times across different browsers.

## If I Had More Time

With another 2-4 hours I'd add:

1. **Real-time presence** - Show little avatars of who's viewing a document
2. **Comments** - Inline commenting like Google Docs
3. **Export** - Download as PDF or Markdown
4. **Search** - Find documents by content
5. **Better auth** - OAuth login with Google

But honestly, the core is solid and the scope felt right for the time box.

## Running It Locally

It's really straightforward:

```bash
# Install everything
npm run install:all

# Start both servers
npm run dev
```

Frontend runs on http://localhost:5173  
Backend API runs on http://localhost:3001

Full instructions are in the README.

## Final Thoughts

I tried to build something that felt complete within the time limit rather than spreading myself thin across too many half-done features. The editor works well, sharing is solid, and the code is clean and tested.

The architecture is simple but sound - easy to understand and extend. I documented my tradeoffs clearly so you can see my thinking.

Thanks for your time reviewing this! Happy to answer any questions.

---

**Project:** CollabWrite  
**Time Spent:** ~5-6 hours  
**GitHub:** https://github.com/CodeCrafter0910/CollabWrite  
**Live Demo:** https://collabwrite-bcsw.onrender.com  
**Video Walkthrough:** https://www.loom.com/share/f0084778ef9e4763848d256c27abe095
