# 🌳 BFHL Tree Explorer

Built for the Chitkara Full Stack Engineering Challenge (Round 1).

## What it does
Takes node relationship strings like `A->B, A->C` and:
- Builds tree hierarchies
- Detects cycles
- Flags invalid entries and duplicate edges
- Shows a summary of all trees

## Live Links
- 🌐 Frontend: https://radiant-marigold-0d6fee.netlify.app
- ⚙️ Backend API: https://bfhl-backend-n49y.onrender.com/bfhl
- 📁 GitHub: https://github.com/sejalbajaj2004/bfhl-project

## Tech Stack
- **Backend:** Node.js + Express → hosted on Render
- **Frontend:** HTML + CSS + JS → hosted on Netlify

## Run Locally
```bash
cd backend
npm install
node index.js
```
Then open `frontend/index.html` in your browser and set `API_URL` to `http://localhost:3000/bfhl`.

## API
**POST** `/bfhl` — accepts `{ "data": ["A->B", "A->C"] }` and returns trees, cycles, invalid entries, duplicates, and summary.

## Author
Sejal Bajaj | Roll: 2310991127 | Chitkara University