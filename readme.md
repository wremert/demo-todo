# Task List

A simple task list that runs in the browser and saves tasks locally.

**Live:** [add URL after deploying to GitHub Pages]

---

## What it does

Add and delete tasks, and tick them off when they're done. Done tasks move to the bottom, and a counter shows how many are left. Everything is saved to localStorage, so your tasks are still there when you reload the page.

---

## Getting started

### Requirements

- A browser (Chrome, Firefox, Safari or Edge)
- Node.js 18+ (to run linting locally)

### Installation

```bash
git clone https://github.com/[your-username]/task-list
cd task-list
npm install
```

### Configuration

No external services or environment variables required.

### Running the project

Open `index.html` directly in your browser. Or start a local server:

```bash
npx serve .
```

### Tests

```bash
npm test
```

Runs the real `index.html`, `app.js` and `style.css` in jsdom. Run it before every change is considered done.

---

## Tech stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Frontend | Vanilla JS | No build step, easy to understand and modify |
| Storage | localStorage | No backend needed |
| Hosting | GitHub Pages | Free, automatic deployment via CI/CD |

---

## Limitations

- Tasks do not sync between devices
- No login or shared lists
- Tasks are lost if browser data is cleared

---

## Built with

Claude Code (agent-driven development) as part of the course Next-Generation Software Development with AI.