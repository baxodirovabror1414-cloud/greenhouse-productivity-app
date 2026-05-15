import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import {
  Leaf,
  Thermometer,
  TrendingUp,
  Wind,
  Droplets,
  Sun,
  Plus,
  RefreshCw,
  CheckCircle2,
  Circle,
  Sparkles,
  FlaskConical,
  BarChart3,
  X,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const nowMs = () => Date.now();

const PLANTS = [
  { id: "fern", name: "Fern", emoji: "🌿", color: "#4ade80" },
  { id: "monstera", name: "Monstera", emoji: "🪴", color: "#22c55e" },
  { id: "ficus", name: "Ficus", emoji: "🌳", color: "#16a34a" },
  { id: "orchid", name: "Orchid", emoji: "🌸", color: "#f472b6" },
  { id: "cactus", name: "Cactus", emoji: "🌵", color: "#84cc16" },
];

const STAGES = [
  { stage: 1, label: "Seedling", scale: 0.4, tasks: 0 },
  { stage: 2, label: "Sprout", scale: 0.55, tasks: 2 },
  { stage: 3, label: "Small Plant", scale: 0.70, tasks: 5 },
  { stage: 4, label: "Mature", scale: 0.85, tasks: 9 },
  { stage: 5, label: "Flowering", scale: 1.0, tasks: 14 },
];

function getStage(tasksCompleted) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (tasksCompleted >= STAGES[i].tasks) return STAGES[i];
  }
  return STAGES[0];
}

function getHealthFilter(health) {
  if (health >= 80) return "none";
  if (health >= 60) return "saturate(0.7) sepia(0.2)";
  if (health >= 40) return "saturate(0.4) sepia(0.5)";
  return "saturate(0.1) sepia(0.9) brightness(0.8)";
}

const CLIENT_ID_KEY = "fg_client_id";
const STATE_CACHE_KEY = "fg_state";

function defaultState() {
  return {
    plants: [],
    tasks: [],
    lastReview: null,
    reviewStreak: 0,
    activityLog: {},
    plantedToday: false,
    lastPlantDate: null,
  };
}

function getClientId() {
  try {
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = `fg_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
  } catch {
    return `fg_fallback_${Date.now()}`;
  }
}

function loadCachedState() {
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultState();
}

function cacheState(state) {
  try {
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(state));
  } catch {}
}

async function loadRemoteState() {
  const clientId = getClientId();
  const { data, error } = await supabase
    .from("forest_greenhouse_states")
    .select("state")
    .eq("client_id", clientId)
    .single();

  if (error) {
    const notFound = error.details?.includes("Results contain 0 rows") || error.code === "PGRST116";
    if (!notFound) {
      console.error("Supabase load error:", error);
    }
    return null;
  }

  return data?.state ?? null;
}

async function saveRemoteState(state) {
  const clientId = getClientId();
  const { error } = await supabase
    .from("forest_greenhouse_states")
    .upsert({
      client_id: clientId,
      state,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Supabase save error:", error);
  }
}

// ─── Plant SVG Renderer ──────────────────────────────────────────────────────

function PlantSVG({ plant, size = 80 }) {
  const stage = getStage(plant.tasksCompleted || 0);
  const sc = stage.scale;
  const health = plant.health ?? 100;
  const filter = getHealthFilter(health);
  const col = plant.color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      style={{ filter, transition: "filter 1s ease" }}
    >
      {/* Pot */}
      <ellipse cx="40" cy="72" rx="16" ry="5" fill="rgba(0,0,0,0.18)" />
      <path d="M28 68 Q30 78 50 78 Q70 78 52 68 Z" fill="#9a6b3b" />
      <rect x="26" y="60" width="28" height="10" rx="3" fill="#b07d45" />
      <rect x="24" y="58" width="32" height="5" rx="2" fill="#c8964f" />

      {/* Stem */}
      <line
        x1="40"
        y1="58"
        x2="40"
        y2={58 - 22 * sc}
        stroke={col}
        strokeWidth={2 * sc}
        strokeLinecap="round"
      />

      {/* Stage-based foliage */}
      {stage.stage >= 1 && (
        <ellipse
          cx="40"
          cy={58 - 22 * sc}
          rx={7 * sc}
          ry={6 * sc}
          fill={col}
          opacity="0.9"
        />
      )}
      {stage.stage >= 2 && (
        <>
          <ellipse
            cx={36 - 4 * sc}
            cy={58 - 18 * sc}
            rx={9 * sc}
            ry={7 * sc}
            fill={col}
            opacity="0.85"
            transform={`rotate(-25,${36 - 4 * sc},${58 - 18 * sc})`}
          />
          <ellipse
            cx={44 + 4 * sc}
            cy={58 - 18 * sc}
            rx={9 * sc}
            ry={7 * sc}
            fill={col}
            opacity="0.85"
            transform={`rotate(25,${44 + 4 * sc},${58 - 18 * sc})`}
          />
        </>
      )}
      {stage.stage >= 3 && (
        <>
          <ellipse
            cx={33 - 3 * sc}
            cy={58 - 28 * sc}
            rx={11 * sc}
            ry={8 * sc}
            fill={col}
            opacity="0.8"
            transform={`rotate(-35,${33 - 3 * sc},${58 - 28 * sc})`}
          />
          <ellipse
            cx={47 + 3 * sc}
            cy={58 - 28 * sc}
            rx={11 * sc}
            ry={8 * sc}
            fill={col}
            opacity="0.8"
            transform={`rotate(35,${47 + 3 * sc},${58 - 28 * sc})`}
          />
        </>
      )}
      {stage.stage >= 4 && (
        <ellipse
          cx="40"
          cy={58 - 36 * sc}
          rx={12 * sc}
          ry={10 * sc}
          fill={col}
          opacity="0.75"
        />
      )}
      {stage.stage >= 5 && (
        <>
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <circle
              key={i}
              cx={40 + 10 * sc * Math.cos((angle * Math.PI) / 180)}
              cy={58 - 40 * sc + 10 * sc * Math.sin((angle * Math.PI) / 180)}
              r={4 * sc}
              fill="#fbbf24"
              opacity="0.95"
            />
          ))}
          <circle cx="40" cy={58 - 40 * sc} r={3 * sc} fill="#fde68a" />
        </>
      )}

      {/* Health sparkle overlay */}
      {health >= 80 && stage.stage >= 3 && (
        <g opacity="0.7">
          <circle cx={40 + 15} cy={58 - 30 * sc} r="2" fill="#fff" />
          <circle cx={40 - 14} cy={58 - 25 * sc} r="1.5" fill="#fff" />
        </g>
      )}
    </svg>
  );
}

// ─── Dust Overlay ────────────────────────────────────────────────────────────

function DustOverlay({ dustLevel, cleaning, onMaintain }) {
  if (dustLevel === 0) return null;
  const opacity = Math.min(dustLevel / 100, 0.75);
  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 flex items-end justify-center pb-16"
      style={{
        backdropFilter: `blur(${dustLevel * 0.08}px)`,
        background: `rgba(120,120,100,${opacity * 0.45})`,
        transition: cleaning ? "all 1.5s ease-out" : "all 3s ease-in",
      }}
    >
      <button
        className="pointer-events-auto px-6 py-3 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 flex items-center gap-2"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.35)",
          backdropFilter: "blur(12px)",
          color: "#fff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
        onClick={onMaintain}
      >
        <RefreshCw size={16} className={cleaning ? "animate-spin" : ""} />
        {cleaning ? "Cleaning…" : "🧹 Maintain Greenhouse"}
      </button>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function ForestGreenhouse() {
  const [state, setState] = useState(loadCachedState);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("greenhouse");
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedPlantType, setSelectedPlantType] = useState(PLANTS[0]);
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [dustLevel, setDustLevel] = useState(0);
  const [cleaning, setCleaning] = useState(false);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);

  // ── Persist state ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      const remoteState = await loadRemoteState();
      if (!mounted) return;
      if (remoteState) {
        setState(remoteState);
      } else {
        cacheState(state);
      }
      setStateLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!stateLoaded) return;
    cacheState(state);
    saveRemoteState(state);
  }, [state, stateLoaded]);

  // ── Compute dust level from last review ──
  useEffect(() => {
    const lr = state.lastReview;
    if (!lr) { setDustLevel(60); return; }
    const hoursElapsed = (nowMs() - lr) / 3_600_000;
    if (hoursElapsed < 24) setDustLevel(0);
    else if (hoursElapsed < 48) setDustLevel(Math.round((hoursElapsed - 24) / 24 * 60));
    else setDustLevel(Math.min(100, Math.round(60 + (hoursElapsed - 48) / 24 * 20)));
  }, [state.lastReview]);

  const notify = useCallback((msg, type = "success") => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification({ msg, type });
    notifTimer.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── Reset daily plant flag ──
  useEffect(() => {
    if (state.lastPlantDate !== today() && state.plantedToday) {
      setState(s => ({ ...s, plantedToday: false }));
    }
  }, []);

  // ── Log activity ──
  const logActivity = useCallback(() => {
    const d = today();
    setState(s => ({
      ...s,
      activityLog: { ...s.activityLog, [d]: (s.activityLog[d] || 0) + 1 },
    }));
  }, []);

  // ── Plant a new plant ──
  const plantSeed = () => {
    if (state.plantedToday) { notify("You've already planted today!", "warn"); return; }
    const newPlant = {
      id: `${selectedPlantType.id}_${Date.now()}`,
      type: selectedPlantType.id,
      name: selectedPlantType.name,
      emoji: selectedPlantType.emoji,
      color: selectedPlantType.color,
      tasksCompleted: 0,
      health: 100,
      plantedOn: today(),
      lastTaskDate: today(),
    };
    setState(s => ({
      ...s,
      plants: [...s.plants, newPlant],
      plantedToday: true,
      lastPlantDate: today(),
    }));
    logActivity();
    setShowPlantModal(false);
    notify(`${selectedPlantType.emoji} ${selectedPlantType.name} planted!`);
  };

  // ── Add task ──
  const addTask = () => {
    if (!newTaskText.trim() || !selectedPlantId) return;
    const task = {
      id: `task_${Date.now()}`,
      text: newTaskText.trim(),
      plantId: selectedPlantId,
      done: false,
      createdOn: today(),
    };
    setState(s => ({ ...s, tasks: [...s.tasks, task] }));
    setNewTaskText("");
    setShowTaskModal(false);
    notify("Task added 🌱");
  };

  // ── Complete task ──
  const completeTask = (taskId) => {
    setState(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task || task.done) return s;
      const updatedTasks = s.tasks.map(t =>
        t.id === taskId ? { ...t, done: true, completedOn: today() } : t
      );
      const plantTasks = updatedTasks.filter(t => t.plantId === task.plantId && t.done).length;
      const updatedPlants = s.plants.map(p =>
        p.id === task.plantId
          ? { ...p, tasksCompleted: plantTasks, health: Math.min(100, (p.health || 100) + 5), lastTaskDate: today() }
          : p
      );
      return { ...s, tasks: updatedTasks, plants: updatedPlants };
    });
    logActivity();
    notify("Task complete! Your plant grows 🌿");
  };

  // ── Log review / maintenance ──
  const logReview = () => {
    setCleaning(true);
    setTimeout(() => {
      setState(s => ({
        ...s,
        lastReview: nowMs(),
        reviewStreak: (s.reviewStreak || 0) + 1,
        plants: s.plants.map(p => ({ ...p, health: Math.min(100, (p.health || 100) + 15) })),
      }));
      logActivity();
      setDustLevel(0);
      setCleaning(false);
      notify("✨ Greenhouse restored! Plants revitalised.");
    }, 1800);
  };

  // ── Degrade plant health over time ──
  useEffect(() => {
    const updatedPlants = state.plants.map(p => {
      const daysSince = (nowMs() - new Date(p.lastTaskDate || p.plantedOn).getTime()) / 86_400_000;
      if (daysSince > 1) {
        return { ...p, health: Math.max(10, (p.health || 100) - Math.floor(daysSince - 1) * 8) };
      }
      return p;
    });
    const hasChange = updatedPlants.some((p, i) => p.health !== state.plants[i]?.health);
    if (hasChange) setState(s => ({ ...s, plants: updatedPlants }));
  }, []);

  // ── Analytics data ──
  const weeklyData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
      days.push({
        day: dayLabel,
        plants: state.plants.filter(p => p.plantedOn === key).length,
        activity: state.activityLog[key] || 0,
        health: state.plants.length > 0
          ? Math.round(state.plants.reduce((a, p) => a + (p.health || 100), 0) / state.plants.length)
          : 100,
      });
    }
    return days;
  })();

  const avgHealth = state.plants.length > 0
    ? Math.round(state.plants.reduce((a, p) => a + (p.health || 100), 0) / state.plants.length)
    : 100;

  const pendingTasks = state.tasks.filter(t => !t.done);
  const doneTasks = state.tasks.filter(t => t.done);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f2a0f 0%, #1a3a1a 30%, #0d2620 60%, #0a1f0a 100%)",
        fontFamily: "'Georgia', 'Cambria', serif",
      }}
    >
      {/* Forest BG elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Tree silhouettes */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${i * 9 - 2}%`,
              width: `${60 + (i % 3) * 25}px`,
              height: `${280 + (i % 5) * 80}px`,
              background: `rgba(5,${15 + (i % 4) * 5},5,${0.6 + (i % 3) * 0.15})`,
              clipPath: "polygon(50% 0%, 15% 60%, 30% 60%, 10% 90%, 40% 90%, 25% 100%, 75% 100%, 60% 90%, 90% 90%, 70% 60%, 85% 60%)",
            }}
          />
        ))}
        {/* Ambient light shafts */}
        <div
          className="absolute top-0 left-1/4 w-64 h-full opacity-5"
          style={{
            background: "linear-gradient(180deg, rgba(200,255,150,0.4) 0%, transparent 70%)",
            transform: "skewX(-8deg)",
          }}
        />
        <div
          className="absolute top-0 right-1/3 w-32 h-full opacity-5"
          style={{
            background: "linear-gradient(180deg, rgba(200,255,150,0.3) 0%, transparent 60%)",
            transform: "skewX(5deg)",
          }}
        />
        {/* Particles */}
        {[...Array(18)].map((_, i) => (
          <div
            key={`p${i}`}
            className="absolute rounded-full"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              left: `${(i * 7) % 100}%`,
              top: `${(i * 13) % 80}%`,
              background: "rgba(180,255,120,0.35)",
              animation: `float ${4 + (i % 4)}s ease-in-out ${i * 0.4}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float { from { transform: translateY(0px); opacity:0.3; } to { transform: translateY(-18px); opacity:0.7; } }
        @keyframes growIn { from { transform: scale(0.5); opacity:0; } to { transform: scale(1); opacity:1; } }
        @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 12px rgba(74,222,128,0)} }
        .glass { background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); }
        .glass-dark { background: rgba(0,30,0,0.45); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.09); }
        .glass-hover:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transition: all 0.2s; }
        .tab-active { background: rgba(74,222,128,0.18); border-color: rgba(74,222,128,0.45) !important; color: #4ade80; }
        .plant-card { animation: growIn 0.4s ease-out; }
        .notif { animation: slideUp 0.3s ease-out; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.3); border-radius: 2px; }
      `}</style>

      {/* Dust overlay */}
      <DustOverlay dustLevel={dustLevel} cleaning={cleaning} onMaintain={logReview} />

      {/* Notification */}
      {notification && (
        <div
          className="fixed top-5 right-5 z-50 notif px-5 py-3 rounded-2xl text-sm font-medium"
          style={{
            background: notification.type === "warn" ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.15)",
            border: `1px solid ${notification.type === "warn" ? "rgba(251,191,36,0.4)" : "rgba(74,222,128,0.4)"}`,
            backdropFilter: "blur(12px)",
            color: notification.type === "warn" ? "#fbbf24" : "#4ade80",
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header
        className="relative z-10 px-6 py-4 flex items-center justify-between"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,20,0,0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}
          >
            <Leaf size={20} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ color: "#e8f5e0", fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.03em" }}>
              The Forest Greenhouse
            </h1>
            <p style={{ color: "rgba(180,220,160,0.55)", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Knowledge grows here
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Health badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: avgHealth >= 70 ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)",
              border: `1px solid ${avgHealth >= 70 ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: avgHealth >= 70 ? "#4ade80" : "#fbbf24",
                animation: "shimmer 2s ease-in-out infinite",
              }}
            />
            <span style={{ color: avgHealth >= 70 ? "#4ade80" : "#fbbf24", fontSize: "0.75rem" }}>
              {avgHealth}% health
            </span>
          </div>

          {dustLevel > 30 && (
            <button
              onClick={logReview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
              style={{
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.35)",
                color: "#fbbf24",
                animation: "pulse-green 2s infinite",
              }}
            >
              <RefreshCw size={12} className={cleaning ? "animate-spin" : ""} />
              Maintain
            </button>
          )}
        </div>
      </header>

      {/* Nav Tabs */}
      <nav
        className="relative z-10 px-6 pt-4 pb-0 flex gap-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {[
          { id: "greenhouse", label: "Greenhouse", icon: Leaf },
          { id: "tasks", label: "Tasks", icon: CheckCircle2 },
          { id: "climate", label: "Climate Control", icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`glass flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm transition-all ${activeTab === id ? "tab-active" : ""}`}
            style={{
              color: activeTab === id ? "#4ade80" : "rgba(180,220,160,0.6)",
              borderBottom: "none",
              marginBottom: "-1px",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="relative z-10 p-6 max-w-6xl mx-auto">

        {/* ── GREENHOUSE TAB ── */}
        {activeTab === "greenhouse" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ color: "#e8f5e0", fontSize: "1.3rem", fontWeight: 600 }}>
                  🌿 Your Garden
                </h2>
                <p style={{ color: "rgba(180,220,160,0.55)", fontSize: "0.8rem" }}>
                  {state.plants.length} plants growing • {doneTasks.length} tasks complete
                </p>
              </div>
              <button
                onClick={() => setShowPlantModal(true)}
                disabled={state.plantedToday}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: state.plantedToday ? "rgba(255,255,255,0.04)" : "rgba(74,222,128,0.15)",
                  border: `1px solid ${state.plantedToday ? "rgba(255,255,255,0.08)" : "rgba(74,222,128,0.4)"}`,
                  color: state.plantedToday ? "rgba(180,220,160,0.35)" : "#4ade80",
                  cursor: state.plantedToday ? "not-allowed" : "pointer",
                }}
              >
                <Plus size={15} />
                {state.plantedToday ? "Planted today" : "Plant a Seed"}
              </button>
            </div>

            {state.plants.length === 0 ? (
              <div
                className="glass rounded-3xl p-16 text-center"
                style={{ color: "rgba(180,220,160,0.4)" }}
              >
                <div style={{ fontSize: "3rem" }}>🌱</div>
                <p className="mt-3 text-sm">Your greenhouse is empty.</p>
                <p className="text-xs mt-1 opacity-70">Plant your first seed to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {state.plants.map(plant => {
                  const stage = getStage(plant.tasksCompleted || 0);
                  const plantTasks = state.tasks.filter(t => t.plantId === plant.id);
                  const done = plantTasks.filter(t => t.done).length;
                  return (
                    <div
                      key={plant.id}
                      className="glass glass-hover plant-card rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer"
                      onClick={() => { setSelectedPlantId(plant.id); setShowTaskModal(true); }}
                      title="Click to add a task"
                    >
                      <PlantSVG plant={plant} size={80} />
                      <p style={{ color: "#d4f0c0", fontSize: "0.78rem", fontWeight: 600, textAlign: "center" }}>
                        {plant.name}
                      </p>
                      <p style={{ color: "rgba(180,220,160,0.55)", fontSize: "0.65rem" }}>
                        {stage.label}
                      </p>
                      {/* Health bar */}
                      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${plant.health ?? 100}%`,
                            background: (plant.health ?? 100) >= 70
                              ? "linear-gradient(90deg,#4ade80,#86efac)"
                              : (plant.health ?? 100) >= 40
                              ? "linear-gradient(90deg,#fbbf24,#fde68a)"
                              : "linear-gradient(90deg,#ef4444,#fca5a5)",
                          }}
                        />
                      </div>
                      <p style={{ color: "rgba(180,220,160,0.4)", fontSize: "0.6rem" }}>
                        {done}/{plantTasks.length} tasks
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stage legend */}
            <div
              className="glass rounded-2xl p-4 mt-6 flex flex-wrap gap-3 items-center"
            >
              <span style={{ color: "rgba(180,220,160,0.5)", fontSize: "0.7rem", marginRight: "4px" }}>
                GROWTH STAGES:
              </span>
              {STAGES.map(s => (
                <div key={s.stage} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: `rgba(74,222,128,${0.3 + s.stage * 0.14})` }}
                  />
                  <span style={{ color: "rgba(180,220,160,0.6)", fontSize: "0.68rem" }}>
                    {s.label} ({s.tasks}+ tasks)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 style={{ color: "#e8f5e0", fontSize: "1.3rem", fontWeight: 600 }}>
                  ✅ Task Garden
                </h2>
                <p style={{ color: "rgba(180,220,160,0.55)", fontSize: "0.8rem" }}>
                  {pendingTasks.length} pending · {doneTasks.length} complete
                </p>
              </div>
              {state.plants.length > 0 && (
                <button
                  onClick={() => { setSelectedPlantId(state.plants[0].id); setShowTaskModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    color: "#4ade80",
                  }}
                >
                  <Plus size={14} /> Add Task
                </button>
              )}
            </div>

            {state.tasks.length === 0 ? (
              <div
                className="glass rounded-3xl p-14 text-center"
                style={{ color: "rgba(180,220,160,0.4)" }}
              >
                <div style={{ fontSize: "2.5rem" }}>📋</div>
                <p className="mt-3 text-sm">No tasks yet. Plant a seed first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.tasks.map(task => {
                  const plant = state.plants.find(p => p.id === task.plantId);
                  return (
                    <div
                      key={task.id}
                      className="glass glass-hover rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
                      style={{ opacity: task.done ? 0.55 : 1 }}
                    >
                      <button
                        onClick={() => !task.done && completeTask(task.id)}
                        style={{ color: task.done ? "#4ade80" : "rgba(180,220,160,0.4)", flexShrink: 0 }}
                      >
                        {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            color: task.done ? "rgba(180,220,160,0.5)" : "#d4f0c0",
                            fontSize: "0.85rem",
                            textDecoration: task.done ? "line-through" : "none",
                          }}
                        >
                          {task.text}
                        </p>
                        {plant && (
                          <p style={{ color: "rgba(180,220,160,0.4)", fontSize: "0.68rem" }}>
                            {plant.emoji} {plant.name}
                          </p>
                        )}
                      </div>
                      {task.done && (
                        <span style={{ color: "#4ade80", fontSize: "0.68rem" }}>Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Review / Repetition CTA */}
            <div
              className="glass rounded-2xl p-5 mt-6 flex items-center justify-between"
              style={{ border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <div className="flex items-center gap-3">
                <FlaskConical size={20} color="#fbbf24" />
                <div>
                  <p style={{ color: "#fde68a", fontSize: "0.85rem", fontWeight: 600 }}>
                    Knowledge Review
                  </p>
                  <p style={{ color: "rgba(253,230,138,0.55)", fontSize: "0.72rem" }}>
                    Last reviewed:{" "}
                    {state.lastReview
                      ? new Date(state.lastReview).toLocaleString()
                      : "Never — glass is dusty!"}
                  </p>
                </div>
              </div>
              <button
                onClick={logReview}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  color: "#fbbf24",
                }}
              >
                <RefreshCw size={14} className={cleaning ? "animate-spin" : ""} />
                Log Review
              </button>
            </div>
          </div>
        )}

        {/* ── CLIMATE CONTROL TAB ── */}
        {activeTab === "climate" && (
          <div>
            <div className="mb-6">
              <h2 style={{ color: "#e8f5e0", fontSize: "1.3rem", fontWeight: 600 }}>
                🌡 Climate Control Dashboard
              </h2>
              <p style={{ color: "rgba(180,220,160,0.55)", fontSize: "0.8rem" }}>
                Growth analytics & health monitoring
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Plants", value: state.plants.length, icon: Leaf, color: "#4ade80" },
                { label: "Avg Health", value: `${avgHealth}%`, icon: Thermometer, color: avgHealth >= 70 ? "#4ade80" : "#fbbf24" },
                { label: "Tasks Done", value: doneTasks.length, icon: CheckCircle2, color: "#86efac" },
                { label: "Review Streak", value: state.reviewStreak || 0, icon: Sparkles, color: "#fbbf24" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass rounded-2xl p-4 flex flex-col gap-2">
                  <Icon size={18} color={color} />
                  <p style={{ color, fontSize: "1.5rem", fontWeight: 700 }}>{value}</p>
                  <p style={{ color: "rgba(180,220,160,0.5)", fontSize: "0.7rem" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div className="glass rounded-2xl p-5 mb-4">
              <p style={{ color: "#d4f0c0", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px" }}>
                🌱 Plants Grown Per Day (7 days)
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(0,30,0,0.85)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "12px", color: "#d4f0c0", fontSize: "12px" }}
                    cursor={{ fill: "rgba(74,222,128,0.06)" }}
                  />
                  <Bar dataKey="plants" fill="#4ade80" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line chart: activity */}
            <div className="glass rounded-2xl p-5 mb-4">
              <p style={{ color: "#d4f0c0", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px" }}>
                📈 Daily Activity Consistency
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(0,30,0,0.85)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "12px", color: "#d4f0c0", fontSize: "12px" }}
                  />
                  <Line type="monotone" dataKey="activity" stroke="#86efac" strokeWidth={2.5} dot={{ fill: "#4ade80", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4ade80" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Health score chart */}
            <div className="glass rounded-2xl p-5">
              <p style={{ color: "#d4f0c0", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px" }}>
                💚 Plant Health Score (7-day avg)
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(180,220,160,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(0,30,0,0.85)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "12px", color: "#d4f0c0", fontSize: "12px" }}
                  />
                  <Line type="monotone" dataKey="health" stroke="#fbbf24" strokeWidth={2.5} dot={{ fill: "#fbbf24", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#fbbf24" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>

      {/* ── Plant Modal ── */}
      {showPlantModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowPlantModal(false)}
        >
          <div
            className="glass-dark rounded-3xl p-6 w-full max-w-sm"
            style={{ animation: "growIn 0.25s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ color: "#e8f5e0", fontWeight: 600 }}>🌱 Plant a Seed</h3>
              <button onClick={() => setShowPlantModal(false)}>
                <X size={16} color="rgba(180,220,160,0.5)" />
              </button>
            </div>
            <p style={{ color: "rgba(180,220,160,0.6)", fontSize: "0.78rem", marginBottom: "16px" }}>
              Choose your plant for today. One seed per day.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {PLANTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlantType(p)}
                  className="rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all"
                  style={{
                    background: selectedPlantType.id === p.id ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedPlantType.id === p.id ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
                  <span style={{ color: selectedPlantType.id === p.id ? "#4ade80" : "rgba(180,220,160,0.6)", fontSize: "0.65rem" }}>
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={plantSeed}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.2))",
                border: "1px solid rgba(74,222,128,0.45)",
                color: "#4ade80",
              }}
            >
              Plant {selectedPlantType.emoji} {selectedPlantType.name}
            </button>
          </div>
        </div>
      )}

      {/* ── Task Modal ── */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowTaskModal(false)}
        >
          <div
            className="glass-dark rounded-3xl p-6 w-full max-w-sm"
            style={{ animation: "growIn 0.25s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: "#e8f5e0", fontWeight: 600 }}>📝 Add Task</h3>
              <button onClick={() => setShowTaskModal(false)}>
                <X size={16} color="rgba(180,220,160,0.5)" />
              </button>
            </div>
            {/* Plant selector */}
            <div className="mb-4">
              <p style={{ color: "rgba(180,220,160,0.6)", fontSize: "0.72rem", marginBottom: "8px" }}>Assign to plant</p>
              <div className="flex flex-wrap gap-2">
                {state.plants.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlantId(p.id)}
                    className="px-3 py-1.5 rounded-xl text-xs transition-all"
                    style={{
                      background: selectedPlantId === p.id ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedPlantId === p.id ? "rgba(74,222,128,0.45)" : "rgba(255,255,255,0.08)"}`,
                      color: selectedPlantId === p.id ? "#4ade80" : "rgba(180,220,160,0.5)",
                    }}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              placeholder="e.g. Review chapter 3, Practice flashcards…"
              className="w-full rounded-2xl px-4 py-3 mb-4 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#d4f0c0",
              }}
              autoFocus
            />
            <button
              onClick={addTask}
              disabled={!newTaskText.trim() || !selectedPlantId}
              className="w-full py-3 rounded-2xl font-semibold text-sm disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(34,197,94,0.2))",
                border: "1px solid rgba(74,222,128,0.45)",
                color: "#4ade80",
              }}
            >
              Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
