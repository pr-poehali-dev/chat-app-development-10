import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const CONTACTS = [
  {
    id: 1,
    name: "Алексей Громов",
    avatar: "АГ",
    color: "from-cyan-400 to-blue-500",
    lastMsg: "Договорились, буду в 18:00 👍",
    time: "14:32",
    unread: 2,
    online: true,
    type: "personal",
  },
  {
    id: 2,
    name: "Команда Дизайн",
    avatar: "КД",
    color: "from-violet-500 to-purple-600",
    lastMsg: "Новые макеты загружены в Figma",
    time: "13:15",
    unread: 5,
    online: false,
    type: "group",
    members: 8,
  },
  {
    id: 3,
    name: "Мария Соколова",
    avatar: "МС",
    color: "from-pink-500 to-rose-500",
    lastMsg: "Спасибо за помощь! ❤️",
    time: "12:44",
    unread: 0,
    online: true,
    type: "personal",
  },
  {
    id: 4,
    name: "Dev Team",
    avatar: "DT",
    color: "from-emerald-400 to-teal-500",
    lastMsg: "Деплой прошёл успешно 🚀",
    time: "11:30",
    unread: 0,
    online: false,
    type: "group",
    members: 12,
  },
  {
    id: 5,
    name: "Иван Петров",
    avatar: "ИП",
    color: "from-orange-400 to-amber-500",
    lastMsg: "Когда встретимся?",
    time: "Вчера",
    unread: 1,
    online: false,
    type: "personal",
  },
  {
    id: 6,
    name: "Маркетинг",
    avatar: "МК",
    color: "from-fuchsia-500 to-pink-600",
    lastMsg: "Презентация готова к показу",
    time: "Вчера",
    unread: 0,
    online: false,
    type: "group",
    members: 5,
  },
];

const MESSAGES: Record<number, Array<{ id: number; text: string; mine: boolean; time: string; read?: boolean }>> = {
  1: [
    { id: 1, text: "Привет! Как дела?", mine: false, time: "14:20" },
    { id: 2, text: "Всё отлично! Работаем над новым проектом 🔥", mine: true, time: "14:21", read: true },
    { id: 3, text: "Звучит классно. Что за проект?", mine: false, time: "14:25" },
    { id: 4, text: "Мессенджер нового поколения. Очень крутой дизайн получается!", mine: true, time: "14:28", read: true },
    { id: 5, text: "Договорились, буду в 18:00 👍", mine: false, time: "14:32" },
  ],
  2: [
    { id: 1, text: "Всем привет! Обновил макеты главного экрана", mine: false, time: "13:00" },
    { id: 2, text: "Выглядит здорово! Цветовая схема огонь 🔥", mine: true, time: "13:05", read: true },
    { id: 3, text: "Новые макеты загружены в Figma", mine: false, time: "13:15" },
  ],
  3: [
    { id: 1, text: "Маша, смогла разобраться с задачей?", mine: true, time: "12:30", read: true },
    { id: 2, text: "Да! Ты мне очень помог с объяснением", mine: false, time: "12:38" },
    { id: 3, text: "Спасибо за помощь! ❤️", mine: false, time: "12:44" },
  ],
  4: [
    { id: 1, text: "Начинаем деплой на прод", mine: false, time: "11:20" },
    { id: 2, text: "Удачи! Держите в курсе", mine: true, time: "11:22", read: true },
    { id: 3, text: "Деплой прошёл успешно 🚀", mine: false, time: "11:30" },
  ],
  5: [
    { id: 1, text: "Привет, Иван!", mine: true, time: "Вчера 18:00", read: true },
    { id: 2, text: "Привет! Когда встретимся?", mine: false, time: "Вчера 18:05" },
  ],
  6: [
    { id: 1, text: "Коллеги, нужно обсудить стратегию", mine: false, time: "Вчера 15:00" },
    { id: 2, text: "Буду готов к встрече завтра", mine: true, time: "Вчера 15:30", read: true },
    { id: 3, text: "Презентация готова к показу", mine: false, time: "Вчера 16:00" },
  ],
};

type CallState = "idle" | "calling" | "active" | "video";

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
}

interface IndexProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function Index({ user, onLogout }: IndexProps) {
  const [activeChat, setActiveChat] = useState<number>(1);
  const [messages, setMessages] = useState(MESSAGES);
  const [input, setInput] = useState("");
  const [callState, setCallState] = useState<CallState>("idle");
  const [callContact, setCallContact] = useState<(typeof CONTACTS)[0] | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "group">("all");
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const contact = CONTACTS.find((c) => c.id === activeChat)!;
  const currentMessages = messages[activeChat] || [];

  const filtered = CONTACTS.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" || c.type === activeTab;
    return matchSearch && matchTab;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  useEffect(() => {
    if (callState === "active" || callState === "video") {
      callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: Date.now(),
      text: input.trim(),
      mine: true,
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setMessages((prev) => ({ ...prev, [activeChat]: [...(prev[activeChat] || []), newMsg] }));
    setInput("");
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2500);
  };

  const startCall = (type: "audio" | "video") => {
    setCallContact(contact);
    setCallState("calling");
    setTimeout(() => setCallState(type === "video" ? "video" : "active"), 1800);
  };

  const endCall = () => {
    setCallState("idle");
    setCallContact(null);
    setMicMuted(false);
    setCamOff(false);
  };

  return (
    <div className="flex h-screen w-screen mesh-bg font-golos overflow-hidden">

      {/* Sidebar */}
      <aside className="w-80 flex flex-col glass border-r border-white/5 flex-shrink-0 z-10">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 0 20px rgba(0,229,255,0.3)" }}>
            <span className="text-black font-black text-sm">T</span>
          </div>
          <span className="text-xl font-black gradient-brand-text tracking-tight">TalkNest</span>
          <div className="ml-auto">
            <button className="w-8 h-8 rounded-lg glass-light flex items-center justify-center hover:bg-white/10 transition-colors">
              <Icon name="PenSquare" size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-muted/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-white/5 focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-1">
          {(["all", "personal", "group"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "gradient-brand text-black"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {tab === "all" ? "Все" : tab === "personal" ? "Личные" : "Группы"}
            </button>
          ))}
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 animate-fade-in text-left group ${
                activeChat === c.id ? "bg-white/8 shadow-lg" : "hover:bg-white/5"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {c.type === "group" ? <Icon name="Users" size={16} className="text-white" /> : c.avatar}
                </div>
                {c.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background animate-pulse-dot" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold truncate text-foreground/90">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate flex-1">{c.lastMsg}</span>
                  {c.unread > 0 && (
                    <span className="ml-2 min-w-[18px] h-[18px] gradient-brand rounded-full text-[10px] font-bold text-black flex items-center justify-center px-1 flex-shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user.avatar_color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.display_name}</p>
              <p className="text-xs text-emerald-400 font-medium">В сети</p>
            </div>
            <button
              onClick={onLogout}
              title="Выйти"
              className="w-8 h-8 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
            >
              <Icon name="LogOut" size={15} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        {/* Chat Header */}
        <header className="flex items-center gap-4 px-6 py-4 glass border-b border-white/5 z-10">
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${contact.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
              {contact.type === "group" ? <Icon name="Users" size={15} className="text-white" /> : contact.avatar}
            </div>
            {contact.online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-foreground leading-none">{contact.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contact.type === "group"
                ? `${(contact as { members?: number }).members ?? 0} участников`
                : contact.online ? "В сети" : "Был(а) недавно"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startCall("audio")}
              className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-200 text-muted-foreground"
            >
              <Icon name="Phone" size={16} />
            </button>
            <button
              onClick={() => startCall("video")}
              className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-cyan-500/20 hover:text-cyan-400 transition-all duration-200 text-muted-foreground"
            >
              <Icon name="Video" size={16} />
            </button>
            <button className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-all duration-200 text-muted-foreground">
              <Icon name="MoreVertical" size={16} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {currentMessages.map((msg, i) => (
            <div
              key={msg.id}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`flex animate-slide-up ${msg.mine ? "justify-end" : "justify-start"}`}
            >
              {!msg.mine && (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${contact.color} flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1`}>
                  {contact.type === "group" ? <Icon name="Users" size={10} /> : contact.avatar.charAt(0)}
                </div>
              )}
              <div className={`max-w-[65%] ${msg.mine ? "msg-bubble-out" : "msg-bubble-in"} px-4 py-2.5`}>
                <p className={`text-sm leading-relaxed ${msg.mine ? "text-black font-medium" : "text-foreground"}`}>
                  {msg.text}
                </p>
                <div className={`flex items-center gap-1 mt-1 ${msg.mine ? "justify-end" : "justify-start"}`}>
                  <span className={`text-[10px] ${msg.mine ? "text-black/60" : "text-muted-foreground"}`}>
                    {msg.time}
                  </span>
                  {msg.mine && (
                    <Icon name={msg.read ? "CheckCheck" : "Check"} size={11} className={msg.read ? "text-black/70" : "text-black/50"} />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${contact.color} flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-1`}>
                {contact.avatar.charAt(0)}
              </div>
              <div className="msg-bubble-in px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 200, 400].map((delay) => (
                    <span
                      key={delay}
                      style={{ animationDelay: `${delay}ms` }}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing block"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 glass border-t border-white/5">
          <div className="flex items-end gap-3">
            <button className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-muted-foreground hover:text-primary transition-colors flex-shrink-0 self-end mb-0.5">
              <Icon name="Paperclip" size={16} />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Напишите сообщение..."
                rows={1}
                className="w-full bg-muted/60 rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-white/5 focus:border-primary/40 transition-colors resize-none leading-relaxed"
                style={{ maxHeight: "120px" }}
              />
              <button className="absolute right-3 bottom-3 text-muted-foreground hover:text-primary transition-colors">
                <Icon name="Smile" size={16} />
              </button>
            </div>

            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 self-end mb-0.5 ${
                input.trim()
                  ? "gradient-brand text-black hover:scale-105 active:scale-95"
                  : "bg-muted/60 text-muted-foreground cursor-not-allowed"
              }`}
              style={input.trim() ? { boxShadow: "0 0 16px rgba(0,229,255,0.3)" } : {}}
            >
              <Icon name="Send" size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* Call Overlay */}
      {callState !== "idle" && callContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

          {callState === "video" && (
            <div className="absolute inset-0 overflow-hidden">
              <div className={`w-full h-full bg-gradient-to-br ${callContact.color} opacity-15`} />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center animate-scale-in">
            <div className="relative mb-6">
              <div
                className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${callContact.color} flex items-center justify-center text-white font-black text-3xl shadow-2xl`}
              >
                {callContact.type === "group"
                  ? <Icon name="Users" size={40} className="text-white" />
                  : callContact.avatar}
              </div>
              {callState === "calling" && (
                <>
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${callContact.color} opacity-40 animate-ripple`} />
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${callContact.color} opacity-20`} style={{ animation: "ripple 1.5s ease-out 0.5s infinite" }} />
                </>
              )}
            </div>

            <h3 className="text-2xl font-black text-white mb-1">{callContact.name}</h3>
            <p className="text-white/50 text-sm mb-10 font-medium">
              {callState === "calling"
                ? "Вызов..."
                : callState === "video"
                ? `Видеозвонок · ${formatDuration(callDuration)}`
                : `Голосовой звонок · ${formatDuration(callDuration)}`}
            </p>

            <div className="flex items-center gap-5">
              {(callState === "active" || callState === "video") && (
                <>
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                      micMuted ? "bg-red-500 text-white" : "glass-light text-white/80 hover:bg-white/15"
                    }`}
                    style={{ width: 52, height: 52 }}
                  >
                    <Icon name={micMuted ? "MicOff" : "Mic"} size={20} />
                  </button>

                  {callState === "video" && (
                    <button
                      onClick={() => setCamOff(!camOff)}
                      className={`rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                        camOff ? "bg-red-500 text-white" : "glass-light text-white/80 hover:bg-white/15"
                      }`}
                      style={{ width: 52, height: 52 }}
                    >
                      <Icon name={camOff ? "VideoOff" : "Video"} size={20} />
                    </button>
                  )}
                </>
              )}

              <button
                onClick={endCall}
                className="rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-xl hover:bg-red-600 hover:scale-105 active:scale-95 transition-all duration-200"
                style={{ width: 64, height: 64, boxShadow: "0 8px 32px rgba(239,68,68,0.4)" }}
              >
                <Icon name="PhoneOff" size={24} />
              </button>

              {(callState === "active" || callState === "video") && (
                <button
                  className="glass-light text-white/80 rounded-2xl flex items-center justify-center hover:bg-white/15 transition-all duration-200 hover:scale-105"
                  style={{ width: 52, height: 52 }}
                >
                  <Icon name="Volume2" size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}