import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AudioLines, Bot, Check, ChevronRight, Globe2, Mic, MicOff, Plus, Send, ShieldCheck, Sparkles, Square, Volume2, VolumeX, Wifi, X } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: any) => void) | null; onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
declare global { interface Window { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike; } }

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const greeting = "Good morning, Sir. JARVIS systems are online. All primary systems are operational. How may I assist you today?";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [model, setModel] = useState("Awaiting configuration");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [tasks, setTasks] = useState<string[]>(() => JSON.parse(localStorage.getItem("jarvis_tasks") || "[]"));
  const [taskInput, setTaskInput] = useState("");
  const [clock, setClock] = useState(new Date());
  const [notice, setNotice] = useState("");
  const conversationId = useRef(crypto.randomUUID());
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { localStorage.setItem("jarvis_tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    fetch(`${API}/api/health`).then(r => r.json()).then(data => {
      setApiOnline(data.status === "online"); setAiReady(Boolean(data.ai_configured));
      setModel(data.model || "Provider key required");
    }).catch(() => { setApiOnline(false); setAiReady(false); });
  }, []);

  const dateLabel = useMemo(() => clock.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }), [clock]);
  const timeLabel = useMemo(() => clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }), [clock]);

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02; utterance.pitch = 0.92;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(raw = input) {
    const content = raw.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setBusy(true); setNotice("");
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId.current, messages: next.slice(-30) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "The request could not be completed.");
      const updated = [...next, { role: "assistant" as const, content: data.reply }];
      setMessages(updated); speak(data.reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection error.";
      setNotice(message);
      setMessages([...next, { role: "assistant", content: `I’m unable to complete that request at present, Sir. ${message}` }]);
    } finally { setBusy(false); }
  }

  function toggleMic() {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setNotice("Speech recognition is not supported in this browser. Try a current version of Chrome or Edge."); return; }
    const instance = new Recognition();
    recognition.current = instance;
    instance.lang = navigator.language || "en-US"; instance.continuous = false; instance.interimResults = false;
    instance.onresult = event => { const transcript = event.results?.[0]?.[0]?.transcript; if (transcript) void sendMessage(transcript); };
    instance.onerror = () => { setListening(false); setNotice("Microphone recognition failed. Check browser permissions."); };
    instance.onend = () => setListening(false);
    try { instance.start(); setListening(true); } catch { setNotice("Could not start microphone. Check browser permissions."); }
  }

  function addTask() {
    const value = taskInput.trim();
    if (value) { setTasks(old => [...old, value]); setTaskInput(""); }
  }

  return <main className="shell">
    <div className="scanline" />
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Bot size={21}/></div><div><div className="brand-name">J.A.R.V.I.S.</div><div className="brand-sub">STARK INDUSTRIES · PERSONAL SYSTEMS</div></div></div>
      <div className="top-status"><span className={`status-dot ${apiOnline ? "on" : ""}`} />{apiOnline ? "API LINK ESTABLISHED" : "API LINK OFFLINE"}<span className="top-divider"/><span className="secure"><ShieldCheck size={13}/> SECURE SESSION</span></div>
      <div className="clock"><strong>{timeLabel}</strong><span>{dateLabel}</span></div>
    </header>

    <section className="dashboard">
      <aside className="left-rail">
        <div className="panel eyebrow-panel"><div className="panel-heading"><Activity size={14}/> SYSTEM DIAGNOSTICS</div>
          <div className="diagnostic"><span>CORE STATUS</span><b className="good">NOMINAL</b></div>
          <div className="diagnostic"><span>AI PROVIDER</span><b className={aiReady ? "good" : "warn"}>{aiReady ? "READY" : "SETUP REQUIRED"}</b></div>
          <div className="diagnostic"><span>VOICE ENGINE</span><b className="good">BROWSER NATIVE</b></div>
          <div className="diagnostic"><span>MODEL</span><b className="model-value">{model}</b></div>
          <div className="meter-label"><span>CPU TELEMETRY</span><span>—</span></div><div className="meter"><i style={{width:"34%"}}/></div>
          <div className="meter-label"><span>MEMORY TELEMETRY</span><span>—</span></div><div className="meter"><i style={{width:"58%"}}/></div>
          <p className="muted tiny">Hardware metrics unavailable in browser sandbox.</p>
        </div>
        <div className="panel quick-panel"><div className="panel-heading"><Sparkles size={14}/> QUICK COMMANDS</div>
          {["Summarize a complex topic for me","Help me plan my day","Explain a programming concept","Give me three creative ideas"].map((q,i)=><button className="quick-command" key={i} onClick={()=>void sendMessage(q)}><ChevronRight size={13}/>{q}</button>)}
        </div>
      </aside>

      <section className="center-stage">
        <div className="hero">
          <div className={`reactor ${speaking ? "reactor-speaking" : ""} ${listening ? "reactor-listening" : ""}`}>
            <div className="reactor-ring ring-a"/><div className="reactor-ring ring-b"/><div className="reactor-ring ring-c"/>
            <div className="reactor-ticks">{Array.from({length:48},(_,i)=><i key={i} style={{transform:`rotate(${i*7.5}deg) translateY(-151px)`}}/>)}</div>
            <div className="reactor-core"><div className="core-glow"/><div className="core-diamond"/></div>
            <div className="core-label">J</div>
          </div>
          <div className="hero-title">AT YOUR SERVICE, SIR.</div>
          <div className="hero-sub">{listening ? "VOICE INPUT ACTIVE · LISTENING" : speaking ? "AUDIO OUTPUT ACTIVE · RESPONDING" : busy ? "PROCESSING REQUEST · PLEASE STAND BY" : "ALL PRIMARY SYSTEMS · STANDING BY"}</div>
          <div className="audio-bars">{Array.from({length:31},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>
        </div>

        <div className="conversation panel">
          <div className="conversation-head"><div className="panel-heading"><AudioLines size={14}/> COMMUNICATION CHANNEL</div><button className="icon-button" title="New conversation" onClick={()=>{setMessages([{role:"assistant",content:greeting}]);conversationId.current=crypto.randomUUID();setNotice("");}}><Plus size={16}/></button></div>
          <div className="messages">
            {messages.map((message,index)=><div className={`message ${message.role}`} key={index}><div className="message-avatar">{message.role==="assistant" ? <Bot size={15}/> : "YOU"}</div><div className="message-body"><div className="message-meta">{message.role==="assistant" ? "J.A.R.V.I.S." : "USER"} <span>· {message.role==="assistant" ? "ASSISTANT" : "INPUT"}</span></div><p>{message.content}</p></div></div>)}
            {busy && <div className="message assistant"><div className="message-avatar"><Bot size={15}/></div><div className="message-body"><div className="message-meta">J.A.R.V.I.S. · PROCESSING</div><div className="typing"><i/><i/><i/></div></div></div>}
            <div ref={bottomRef}/>
          </div>
          {notice && <div className="notice"><X size={13}/>{notice}</div>}
          <form className="composer" onSubmit={e=>{e.preventDefault();void sendMessage();}}>
            <button type="button" className={`mic-button ${listening ? "active" : ""}`} onClick={toggleMic} title={listening ? "Stop listening" : "Start voice input"}>{listening ? <MicOff size={17}/> : <Mic size={17}/>}</button>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Transmit a command to JARVIS..." aria-label="Message JARVIS"/>
            {speaking && <button type="button" className="icon-button stop-speech" title="Interrupt speech" onClick={()=>{window.speechSynthesis.cancel();setSpeaking(false);}}><Square size={14}/></button>}
            <button type="button" className="icon-button voice-toggle" title={voiceEnabled ? "Mute voice responses" : "Enable voice responses"} onClick={()=>setVoiceEnabled(v=>!v)}>{voiceEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button>
            <button className="send-button" type="submit" disabled={busy || !input.trim()}><Send size={16}/></button>
          </form>
          <div className="composer-foot"><span> <span className="live-dot"/> ENCRYPTED LOCAL CONNECTION</span><span>ENTER TO TRANSMIT · MIC REQUIRES PERMISSION</span></div>
        </div>
      </section>

      <aside className="right-rail">
        <div className="panel status-panel"><div className="panel-heading"><Globe2 size={14}/> NETWORK STATUS</div><div className="network-orbit"><div className="network-core"><Wifi size={25}/></div><span className="orbit-point p1"/><span className="orbit-point p2"/><span className="orbit-point p3"/></div><div className="network-caption">{apiOnline ? "BACKEND REACHABLE" : "AWAITING BACKEND"}</div><div className="diagnostic"><span>LATENCY</span><b>—</b></div><div className="diagnostic"><span>AI SERVICE</span><b className={aiReady ? "good" : "warn"}>{aiReady ? "CONNECTED" : "NOT CONFIGURED"}</b></div></div>
        <div className="panel tasks-panel"><div className="panel-heading"><Check size={14}/> MISSION TASKS <span className="task-count">{tasks.length}</span></div><form className="task-add" onSubmit={e=>{e.preventDefault();addTask();}}><input value={taskInput} onChange={e=>setTaskInput(e.target.value)} placeholder="Add a task..."/><button type="submit" disabled={!taskInput.trim()}><Plus size={15}/></button></form><div className="task-list">{tasks.length===0 ? <p className="empty-tasks">No active missions.<br/>Add a task to begin.</p> : tasks.map((task,i)=><div className="task-item" key={`${task}-${i}`}><span>{task}</span><button onClick={()=>setTasks(old=>old.filter((_,n)=>n!==i))} title="Remove task"><X size={13}/></button></div>)}</div><p className="muted tiny">Tasks are saved in this browser only.</p></div>
        <div className="panel privacy-panel"><div className="panel-heading"><ShieldCheck size={14}/> PRIVACY PROTOCOL</div><p>Microphone is activated only when you press the control. Voice output can be muted or interrupted at any time.</p><div className="privacy-state"><span className="live-dot"/> USER CONTROL ENABLED</div></div>
      </aside>
    </section>
    <footer className="footer"><span>J.A.R.V.I.S. <b>v0.1.0</b> · PERSONAL AI SYSTEM</span><span>DESIGNED FOR CONTROL. BUILT FOR INTELLIGENCE.</span><span><span className="live-dot"/> SYSTEM NOMINAL</span></footer>
  </main>;
}
export default App;
