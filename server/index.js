import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const clientOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim()) : true;

app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: "1mb" }));

const Task = mongoose.model("Task", new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  completed: { type: Boolean, default: false }
}, { timestamps: true }));

const Conversation = mongoose.model("Conversation", new mongoose.Schema({
  title: { type: String, default: "New conversation" },
  messages: [{ role: String, content: String }]
}, { timestamps: true }));

const memoryTasks = [
  { id: "demo-1", title: "Finish my portfolio project", completed: false },
  { id: "demo-2", title: "Practice two interview questions", completed: false },
  { id: "demo-3", title: "Review JavaScript fundamentals", completed: true }
];
const memoryConversations = new Map();
const dbReady = () => mongoose.connection.readyState === 1;
const validObjectId = (value) => mongoose.isValidObjectId(value);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbConnected: dbReady(), aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.get("/api/tasks", async (_req, res) => {
  try {
    const tasks = dbReady() ? await Task.find().sort({ createdAt: -1 }).lean() : memoryTasks;
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Could not load tasks." });
  }
});

app.post("/api/tasks", async (req, res) => {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 180) return res.status(400).json({ error: "Task title is required and must be under 180 characters." });
  try {
    if (dbReady()) return res.status(201).json(await Task.create({ title }));
    const task = { id: "local-" + Date.now(), title, completed: false };
    memoryTasks.unshift(task);
    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ error: "Could not add task." });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    if (dbReady() && validObjectId(req.params.id)) {
      const task = await Task.findByIdAndUpdate(req.params.id, { completed: Boolean(req.body.completed) }, { new: true, runValidators: true });
      if (!task) return res.status(404).json({ error: "Task not found." });
      return res.json(task);
    }
    const task = memoryTasks.find((item) => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });
    task.completed = Boolean(req.body.completed);
    return res.json(task);
  } catch (error) {
    return res.status(500).json({ error: "Could not update task." });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    if (dbReady() && validObjectId(req.params.id)) {
      const result = await Task.findByIdAndDelete(req.params.id);
      if (!result) return res.status(404).json({ error: "Task not found." });
    } else {
      const index = memoryTasks.findIndex((item) => item.id === req.params.id);
      if (index < 0) return res.status(404).json({ error: "Task not found." });
      memoryTasks.splice(index, 1);
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not delete task." });
  }
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (message.length > 8000) return res.status(400).json({ error: "Message is too long." });

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      conversationId: req.body.conversationId || "demo",
      reply: "You're in demo mode. To enable live AI replies, add an OPENAI_API_KEY environment variable to the backend on Render. Your dashboard and task features can still be explored."
    });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let priorMessages = [];
    let conversationId = req.body.conversationId || null;

    if (dbReady()) {
      let conversation = conversationId && validObjectId(conversationId) ? await Conversation.findById(conversationId) : null;
      if (!conversation) {
        conversation = await Conversation.create({ title: message.slice(0, 70), messages: [] });
        conversationId = String(conversation._id);
      }
      priorMessages = conversation.messages.slice(-16).map((item) => ({ role: item.role, content: item.content }));
      conversation.messages.push({ role: "user", content: message });
      await conversation.save();
    } else if (conversationId && memoryConversations.has(conversationId)) {
      priorMessages = memoryConversations.get(conversationId);
    } else {
      conversationId = "demo-" + Date.now();
      memoryConversations.set(conversationId, []);
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are MindSpace AI, a helpful and practical thought partner. Be clear, calm, encouraging, and concise. Break complex requests into manageable steps. Do not pretend to know facts you are unsure about." },
        ...priorMessages,
        { role: "user", content: message }
      ]
    });
    const reply = completion.choices?.[0]?.message?.content || "I couldn't generate a reply just now. Please try again.";

    if (dbReady() && validObjectId(conversationId)) {
      await Conversation.findByIdAndUpdate(conversationId, { $push: { messages: { $each: [{ role: "assistant", content: reply }], $slice: -40 } } });
    } else if (memoryConversations.has(conversationId)) {
      memoryConversations.get(conversationId).push({ role: "user", content: message }, { role: "assistant", content: reply });
    }
    return res.json({ conversationId, reply });
  } catch (error) {
    console.error("AI request failed:", error.message);
    return res.status(502).json({ error: "The AI service couldn't respond. Check the API key, model, and usage limits." });
  }
});

app.get("/api/conversations", async (_req, res) => {
  if (!dbReady()) return res.json([]);
  try {
    const items = await Conversation.find({}, { title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(30).lean();
    return res.json(items);
  } catch {
    return res.status(500).json({ error: "Could not load conversations." });
  }
});

const distDir = path.join(rootDir, "client", "dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"), (error) => {
    if (error) next();
  });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => console.error("MongoDB connection failed; using demo storage:", error.message));
}

app.listen(PORT, () => console.log("MindSpace AI server listening on port " + PORT));
