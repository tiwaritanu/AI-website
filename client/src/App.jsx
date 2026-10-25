import { useEffect, useState } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2,
  Clock3, Focus, LayoutDashboard, Lightbulb, ListTodo, Menu, MessageCircle,
  Plus, Send, Sparkles, Target, Trash2, X
} from "lucide-react";

const starterPrompts = [
  { icon: Lightbulb, title: "Think more clearly", description: "Turn a big idea into small steps", prompt: "Help me break a big goal into clear, manageable steps." },
  { icon: BookOpen, title: "Learn something new", description: "Make a hard topic feel simple", prompt: "Teach me a useful concept in beginner-friendly language with an example." },
  { icon: Target, title: "Plan my week", description: "Build a realistic routine", prompt: "Help me plan a balanced week with priorities, breaks, and time to learn." }
];

const initialTasks = [
  { id: "demo-1", title: "Finish my portfolio project", completed: false },
  { id: "demo-2", title: "Practice two interview questions", completed: false },
  { id: "demo-3", title: "Review JavaScript fundamentals", completed: true }
];

export default function App() {
  const [page, setPage] = useState("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [taskDraft, setTaskDraft] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((data) => setAiReady(Boolean(data.aiConfigured))).catch(() => setAiReady(false));
    fetch("/api/tasks").then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data) && data.length) setTasks(data.map((t) => ({ ...t, id: t.id || t._id })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";
  const navigation = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "AI Assistant", icon: MessageCircle },
    { label: "My tasks", icon: ListTodo },
    { label: "Learning space", icon: BookOpen }
  ];

  async function addTask(event) {
    if (event) event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    let newTask = { id: "local-" + Date.now(), title, completed: false };
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (response.ok) {
        const data = await response.json();
        newTask = { ...data, id: data.id || data._id || newTask.id };
      }
    } catch {}
    setTasks((current) => [newTask, ...current]);
    setTaskDraft("");
    setShowTaskInput(false);
    setToast("Task added");
  }

  async function toggleTask(task) {
    const completedValue = !task.completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: completedValue } : item));
    if (!String(task.id).startsWith("demo-") && !String(task.id).startsWith("local-")) {
      try {
        await fetch("/api/tasks/" + task.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: completedValue })
        });
      } catch {}
    }
  }

  async function deleteTask(task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    if (!String(task.id).startsWith("demo-") && !String(task.id).startsWith("local-")) {
      try { await fetch("/api/tasks/" + task.id, { method: "DELETE" }); } catch {}
    }
    setToast("Task removed");
  }

  async function sendMessage(text = draft) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setDraft("");
    setBusy(true);
    setPage("AI Assistant");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, conversationId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not get a reply.");
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message + " You can keep exploring the workspace while the API is configured." }]);
    } finally {
      setBusy(false);
    }
  }

  function choosePage(label) {
    setPage(label);
    setMobileNav(false);
  }

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={"sidebar" + (mobileNav ? " sidebar-open" : "")}>
        <div className="brand">
          <div className="brand-icon"><Sparkles size={19} /></div>
          <span>mindspace<span className="brand-ai"> AI</span></span>
          <button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-switch"><div className="workspace-avatar">M</div><div><b>My workspace</b><small>Personal space</small></div><span className="switch-chevron">⌄</span></div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {navigation.map((item) => (
            <button key={item.label} className={"nav-item" + (page === item.label ? " selected" : "")} onClick={() => choosePage(item.label)}>
              <item.icon size={18} /><span>{item.label}</span>
              {item.label === "My tasks" && <small className="nav-count">{tasks.filter((task) => !task.completed).length}</small>}
            </button>
          ))}
        </nav>
        <div className="side-label tools-label">YOUR TOOLS</div>
        <button className="nav-item" onClick={() => { setPage("AI Assistant"); sendMessage("Give me five creative ideas for my next portfolio project."); }}>
          <Lightbulb size={18} /><span>Idea generator</span><span className="new-label">NEW</span>
        </button>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-mark"><Sparkles size={16} /></div><b>A little more clarity.</b><p>Your next great idea starts with one small step.</p><button onClick={() => { setPage("AI Assistant"); setToast("Start a chat to explore your next idea."); }}>Find my focus <ArrowUpRight size={14} /></button></div>
          <div className="profile-row"><div className="profile-avatar">D</div><div><b>Your profile</b><small>Free workspace</small></div><span className="profile-dots">•••</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div>
          <div className="topbar-right"><span className={"connection-pill" + (aiReady ? " connected" : "")}><i />{aiReady ? "AI connected" : "Demo mode"}</span><div className="topbar-avatar">D</div></div>
        </header>

        {page === "AI Assistant" ? (
          <section className="content-page assistant-page">
            <div className="eyebrow"><Sparkles size={14} /> YOUR THOUGHT PARTNER</div>
            <h1>A little more <span>clarity.</span></h1>
            <p className="page-subtitle">Ask a question, untangle an idea, or turn a thought into a plan.</p>
            <div className="chat-panel">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-chat"><div className="assistant-orb"><Sparkles size={27} /></div><h3>What's on your mind?</h3><p>Start with a question or choose a prompt below.</p>
                    <div className="starter-grid">{starterPrompts.map((starter) => <button key={starter.title} className="starter-card" onClick={() => sendMessage(starter.prompt)}><starter.icon size={17} /><b>{starter.title}</b><span>{starter.description}</span><ArrowUpRight className="starter-arrow" size={15} /></button>)}</div>
                  </div>
                ) : messages.map((message, index) => <div key={index} className={"message-row " + message.role}><div className={"message-avatar " + message.role}>{message.role === "assistant" ? <Sparkles size={15} /> : "D"}</div><div className="message-content"><b>{message.role === "assistant" ? "MindSpace AI" : "You"}</b><p>{message.content}</p></div></div>)}
                {busy && <div className="message-row assistant"><div className="message-avatar assistant"><Sparkles size={15} /></div><div className="typing"><i /><i /><i /></div></div>}
              </div>
              <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Ask anything, or tell me what you're working on..." /><div className="composer-bottom"><span>Enter to send · Shift + Enter for a new line</span><button disabled={!draft.trim() || busy} aria-label="Send message"><Send size={16} /></button></div></form>
              <p className="privacy-note">✳ AI can make mistakes. Review important information.</p>
            </div>
          </section>
        ) : page === "My tasks" ? (
          <section className="content-page">
            <div className="page-title-row"><div><div className="eyebrow"><ListTodo size={14} /> YOUR PERSONAL SPACE</div><h1>Small steps. <span>Real progress.</span></h1><p className="page-subtitle">Keep the important things moving, one task at a time.</p></div><button className="primary-button" onClick={() => setShowTaskInput((value) => !value)}><Plus size={16} /> Add a task</button></div>
            <TaskList tasks={tasks} toggleTask={toggleTask} deleteTask={deleteTask} showInput={showTaskInput} taskDraft={taskDraft} setTaskDraft={setTaskDraft} addTask={addTask} />
          </section>
        ) : page === "Learning space" ? (
          <section className="content-page learning-page">
            <div className="eyebrow"><BookOpen size={14} /> GROW AT YOUR OWN PACE</div><h1>Stay curious.</h1><p className="page-subtitle">A few good questions can open up a whole new world.</p>
            <div className="learning-grid">
              {[{ icon: BookOpen, title: "Explain a concept", text: "Make a difficult topic feel simple.", prompt: "Explain a difficult technical concept in simple language, with an example." }, { icon: Lightbulb, title: "Explore an idea", text: "Find a fresh angle on something.", prompt: "Help me brainstorm creative ideas for a portfolio project." }, { icon: Activity, title: "Practice a skill", text: "Build confidence through practice.", prompt: "Give me a short JavaScript quiz, one question at a time." }].map((item) => <button key={item.title} className="learning-card" onClick={() => sendMessage(item.prompt)}><div className="learning-icon"><item.icon size={20} /></div><h3>{item.title}</h3><p>{item.text}</p><span>Explore <ArrowUpRight size={14} /></span></button>)}
            </div>
            <div className="learning-tip"><Lightbulb size={21} /><div><b>A thought to take with you</b><p>You don't have to learn everything today. Just understand one thing a little better than you did yesterday.</p></div></div>
          </section>
        ) : (
          <section className="content-page overview-page">
            <div className="welcome-row"><div><div className="eyebrow"><i className="eyebrow-dot" /> YOUR PERSONAL WORKSPACE</div><h1>{greeting}, <span>let's make it count.</span></h1><p>A calmer place to think, plan, and make progress.</p></div><div className="date-chip"><Clock3 size={15} />{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div></div>
            <div className="hero-card"><div className="hero-copy"><div className="hero-tag"><Sparkles size={13} /> YOUR DAILY RESET</div><h2>Make room for<br />what <em>matters.</em></h2><p>Big things get easier when you give them a little space. What's one thing you'd like to move forward today?</p><button className="hero-button" onClick={() => { setPage("AI Assistant"); setMessages([]); }}>Start a conversation <ArrowRight size={16} /></button><div className="hero-meta"><span className="hero-avatar-stack"><i>D</i><i><Sparkles size={10} /></i></span><span>A thought partner for your everyday</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-glow" /><div className="art-orb"><Sparkles size={40} strokeWidth={1.3} /></div><div className="floating-note note-one"><Lightbulb size={14} /> Fresh perspective</div><div className="floating-note note-two"><CheckCircle2 size={14} /> One step at a time</div><div className="art-star star-a">✳</div><div className="art-star star-b">✦</div></div></div>
            <div className="section-heading"><div><h2>Your overview</h2><p>A quick look at how you're doing today.</p></div><button className="text-button" onClick={() => setPage("My tasks")}>View all tasks <ArrowUpRight size={14} /></button></div>
            <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Tasks completed</span><div className="stat-icon lilac"><CheckCircle2 size={17} /></div></div><div className="stat-number">{completed}<small> / {tasks.length}</small></div><div className="progress-track"><div style={{ width: progress + "%" }} /></div><div className="stat-foot">{progress}% of your list complete</div></div><div className="stat-card"><div className="stat-top"><span>Current focus</span><div className="stat-icon peach"><Focus size={17} /></div></div><div className="stat-number">One <span className="word-number">thing</span></div><div className="stat-foot">Give your attention room to breathe.</div><button className="stat-link" onClick={() => setToast("Choose one task and work on it for 25 minutes.")}>Set an intention <ArrowUpRight size={13} /></button></div><div className="stat-card"><div className="stat-top"><span>Learning streak</span><div className="stat-icon mint"><Activity size={17} /></div></div><div className="stat-number">Keep <span className="word-number">going</span></div><div className="stat-foot">A little learning adds up over time.</div><button className="stat-link" onClick={() => setPage("Learning space")}>Learn something <ArrowUpRight size={13} /></button></div></div>
            <div className="bottom-grid"><div className="panel"><div className="panel-heading"><div><h3>Today's priorities</h3><p>Progress over perfection.</p></div><button className="icon-button" onClick={() => setPage("My tasks")} aria-label="Open tasks"><ArrowUpRight size={17} /></button></div><TaskList tasks={tasks.slice(0, 4)} toggleTask={toggleTask} deleteTask={deleteTask} compact /></div><div className="panel"><div className="panel-heading"><div><h3>A little inspiration</h3><p>Where would you like to begin?</p></div><Sparkles size={18} className="purple-icon" /></div><div className="quick-links"><button onClick={() => sendMessage("Help me identify my top priority for today.")}><span className="quick-icon lavender"><Target size={17} /></span><span><b>Find my priority</b><small>Get clear on what matters</small></span><ArrowUpRight size={15} /></button><button onClick={() => sendMessage("Help me brainstorm ideas for a portfolio project.")}><span className="quick-icon peach"><Lightbulb size={17} /></span><span><b>Get a fresh idea</b><small>Think beyond the obvious</small></span><ArrowUpRight size={15} /></button><button onClick={() => setPage("Learning space")}><span className="quick-icon mint"><BookOpen size={17} /></span><span><b>Learn something</b><small>Follow your curiosity</small></span><ArrowUpRight size={15} /></button></div></div></div>
            <footer className="footer-note"><span>Made for a little more clarity.</span><span><Sparkles size={12} /> MindSpace AI</span></footer>
          </section>
        )}
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function TaskList({ tasks, toggleTask, deleteTask, compact = false, showInput = false, taskDraft = "", setTaskDraft = () => {}, addTask = () => {} }) {
  return <div className={"task-list" + (compact ? " compact" : "")}>
    {showInput && <form className="new-task-form" onSubmit={addTask}><input autoFocus value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="What would you like to do?" maxLength={180} /><button type="submit" className="primary-button"><Plus size={15} /> Add</button></form>}
    {tasks.length === 0 && <div className="empty-tasks"><CheckCircle2 size={22} /><b>Nothing on your list just yet.</b><span>Add a small step to get started.</span></div>}
    {tasks.map((task) => <div className={"task-row" + (task.completed ? " task-done" : "")} key={task.id}><button className={"task-check" + (task.completed ? " checked" : "")} onClick={() => toggleTask(task)} aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>{task.completed && <Check size={13} />}</button><span className="task-title">{task.title}</span>{!compact && <span className="task-tag">{task.completed ? "Completed" : "Personal"}</span>}<button className="task-delete icon-button" aria-label="Delete task" onClick={() => deleteTask(task)}><Trash2 size={15} /></button></div>)}
  </div>;
}
