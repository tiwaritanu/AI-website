# MindSpace AI — MERN Portfolio Project

A responsive AI-powered productivity workspace built with React, Express, Node.js, and MongoDB. It includes an AI assistant, a task manager, learning prompts, and a dashboard with a premium responsive interface.

## Features

- Responsive dashboard with overview metrics and task progress
- AI assistant with starter prompts and OpenAI integration
- Create, complete, and delete tasks
- MongoDB persistence when \`MONGODB_URI\` is configured
- Demo storage and a friendly AI setup message when database/API settings are absent
- Express health endpoint at \`/api/health\`
- Render Blueprint configuration in \`render.yaml\`

## Tech stack

- React 18 + Vite
- Node.js + Express
- MongoDB + Mongoose
- OpenAI API (optional)

## Run locally on Windows

Install Node.js 20 or newer. Then open PowerShell in the project root and run:

\`\`\`powershell
npm install
npm install --prefix client
npm install --prefix server
Copy-Item server/.env.example server/.env
npm run dev
\`\`\`

Open http://localhost:5173. The frontend proxies API requests to the Express server in development.

## Environment variables

Configure these in \`server/.env\` locally or in Render's Environment tab:

- \`MONGODB_URI\` — MongoDB Atlas connection string; optional for demo mode
- \`OPENAI_API_KEY\` — OpenAI API key; optional, but required for live AI replies
- \`OPENAI_MODEL\` — defaults to \`gpt-4.1-mini\`
- \`CLIENT_ORIGIN\` — optional allowed-origin setting
- \`PORT\` — provided by Render automatically

Keep secrets on the server. Never commit \`.env\` or put an AI key in a \`VITE_\` variable.

## Deploy with Render

1. Open https://render.com and sign in with GitHub.
2. Choose **New + → Blueprint** and select this repository.
3. Review the service named \`mindspace-ai\` and deploy it.
4. Once the service is created, open its **Environment** settings. Add \`MONGODB_URI\` for durable task/conversation storage and \`OPENAI_API_KEY\` for live AI responses. Set \`OPENAI_MODEL\` only if you want to use a different supported model.
5. Save changes and wait for Render to redeploy. Test \`https://YOUR-SERVICE.onrender.com/api/health\`.

Without MongoDB, task data uses in-memory demo storage and may reset when the service restarts. Without an OpenAI key, the dashboard works but the assistant will return a setup message.

## API routes

- \`GET /api/health\`
- \`GET /api/tasks\`
- \`POST /api/tasks\` — \`{ "title": "Plan my week" }\`
- \`PATCH /api/tasks/:id\` — \`{ "completed": true }\`
- \`DELETE /api/tasks/:id\`
- \`GET /api/conversations\`
- \`POST /api/chat\` — \`{ "message": "...", "conversationId": "..." }\`

## Production note

This portfolio starter does not implement user authentication or per-user data isolation. Do not store private data in a public demo until proper authentication and authorization have been added.
