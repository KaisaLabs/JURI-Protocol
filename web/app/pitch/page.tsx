"use client";
import { useState, useEffect, useCallback } from "react";

const TOTAL = 9;

const slides = [
  {
    title: "JURI",
    titleAccent: "Protocol",
    tagline: "DeFi Exploit Forensics & Cross-Chain Knowledge Base",
    badge: "ETHGlobal Open Agents 2026",
    gradient: "from-slate-950 via-[#0d0d1a] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(201,168,76,0.15)]",
  },
  {
    stat: "$3,000,000,000+",
    statLabel: "Lost to DeFi exploits since 2024",
    title: "The",
    titleAccent: "Problem",
    gradient: "from-slate-950 via-[#1a0a0a] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(239,68,68,0.12)]",
    cards: [
      { icon: "🔁", text: "Same exploits repeat — protocols never learn" },
      { icon: "🐦", text: "Post-mortems scattered across Twitter & Discord" },
      { icon: "⏰", text: "Weeks of manual investigation per incident" },
      { icon: "🔗", text: "Cross-chain attacks nearly impossible to trace" },
    ],
  },
  {
    title: "After Every",
    titleAccent: "Exploit",
    subtitle: "There is no formal resolution process",
    gradient: "from-slate-950 via-[#151008] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(251,191,36,0.08)]",
    timeline: [
      "Protocol gets drained",
      "Twitter war begins",
      "Evidence lost in DMs",
      "Manual investigation (weeks)",
      "Another protocol hit by same vector",
    ],
  },
  {
    title: "Introducing",
    titleAccent: "JURI Protocol",
    tagline: "Exploit Once. Learn Forever.",
    gradient: "from-slate-950 via-[#081508] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(34,197,94,0.10)]",
    agents: [
      { emoji: "🔍", role: "Forensic", desc: "Traces fund flows. Collects on-chain evidence. Stores immutably on 0G." },
      { emoji: "📊", role: "Analysis", desc: "Classifies attack vector. Scores severity. Matches historical patterns." },
      { emoji: "✅", role: "Verification", desc: "Cross-references findings. Publishes post-mortem. TEE-verified." },
    ],
  },
  {
    title: "How It",
    titleAccent: "Works",
    gradient: "from-slate-950 via-[#0a1020] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(96,165,250,0.08)]",
    steps: [
      { num: "01", text: "Exploit detected — JURI activates" },
      { num: "02", text: "Forensic Agent traces funds → 0G Storage KV" },
      { num: "03", text: "Analysis Agent classifies → matches RAG database" },
      { num: "04", text: "Verification Agent cross-checks → 0G Compute TEE" },
      { num: "05", text: "Immutable post-mortem published → 0G Storage Log" },
      { num: "06", text: "Every protocol learns — same exploit never works twice" },
    ],
  },
  {
    title: "Architecture",
    gradient: "from-slate-950 via-[#0d0d1a] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(201,168,76,0.10)]",
    arch: [
      { layer: "INPUT", items: ["Exploit Report", "On-chain Event", "Protocol Alert"], color: "border-slate-600" },
      { layer: "AGENTS", items: ["🔍 Forensic", "📊 Analysis", "✅ Verification"], color: "border-[#e8734a]/40" },
      { layer: "COMMUNICATION", items: ["Gensyn AXL · Encrypted P2P"], color: "border-purple-500/40" },
      { layer: "STORAGE & COMPUTE", items: ["0G Storage KV + Log", "0G Compute TEE"], color: "border-green-500/40" },
      { layer: "EXECUTION", items: ["KeeperHub · Auto-publish", "0G Chain · Immutable Verdict"], color: "border-orange-500/40" },
    ],
  },
  {
    title: "Built",
    titleAccent: "With",
    gradient: "from-slate-950 via-[#100d14] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(168,85,247,0.08)]",
    sponsors: [
      { name: "0G Chain", sub: "EVM · Galileo Testnet", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
      { name: "0G Storage", sub: "KV + Log + File", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
      { name: "0G Compute", sub: "TEE-Verified Inference", color: "text-sky-400 border-sky-500/20 bg-sky-500/5" },
      { name: "Gensyn AXL", sub: "P2P Encrypted Mesh", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
      { name: "KeeperHub", sub: "On-Chain Execution", color: "text-orange-400 border-orange-500/20 bg-orange-500/5" },
      { name: "Solidity", sub: "Smart Contracts", color: "text-gray-400 border-gray-500/20 bg-gray-500/5" },
    ],
  },
  {
    title: "Why",
    titleAccent: "JURI",
    gradient: "from-slate-950 via-[#120d18] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(201,168,76,0.12)]",
    reasons: [
      { icon: "🔒", text: "Immutable evidence — 0G Storage tamper-proof audit trail" },
      { icon: "🧠", text: "Verifiable reasoning — 0G Compute TEE-signed inference" },
      { icon: "🔐", text: "Encrypted P2P — Gensyn AXL agent communication" },
      { icon: "⚡", text: "Auto-execution — KeeperHub on-chain actions" },
      { icon: "🌐", text: "Cross-chain — traces funds across EVM + alt chains" },
      { icon: "📚", text: "Public good — open knowledge base for all protocols" },
    ],
  },
  {
    cta: true,
    title: "JURI",
    titleAccent: "Protocol",
    tagline: "Exploit Once. Learn Forever.",
    gradient: "from-slate-950 via-[#0d1420] to-slate-950",
    accentGlow: "shadow-[0_0_120px_rgba(201,168,76,0.18)]",
    tracks: ["0G Autonomous Agents", "Gensyn AXL", "KeeperHub"],
  },
];

export default function PitchPage() {
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const next = useCallback(() => { setSlide(s => Math.min(s + 1, TOTAL - 1)); setAnimKey(k => k + 1); }, []);
  const prev = useCallback(() => { setSlide(s => Math.max(s - 1, 0)); setAnimKey(k => k + 1); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const s = slides[slide];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${s.gradient} flex items-center justify-center p-6 md:p-12 relative overflow-hidden transition-all duration-1000`}
      onClick={next}
    >
      {/* Background glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-all duration-1000 ${s.accentGlow}`} />

      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-6 z-50 bg-black/20 backdrop-blur-sm border-b border-white/5">
        <span className="text-sm font-bold tracking-wider text-white/60">JURI PROTOCOL</span>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setSlide(i); setAnimKey(k => k + 1); }}
              className={`h-1 rounded-full transition-all duration-500 ${i === slide ? "w-8 bg-[#e8734a]" : "w-4 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>
        <span className="text-xs text-white/30 font-mono">{String(slide + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}</span>
      </nav>

      {/* Slide 0: Hero */}
      {slide === 0 && (
        <div key={animKey} className="text-center space-y-10 animate-slideUp max-w-3xl">
          <span className="inline-block text-xs tracking-[0.3em] uppercase text-[#e8734a]/60 border border-[#e8734a]/20 rounded-full px-5 py-1.5 mb-4">{s.badge}</span>
          <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter leading-none">
            <span className="text-white">{s.title}</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8734a] to-[#f4a261]">{s.titleAccent}</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/40 font-light max-w-xl mx-auto">{s.tagline}</p>
          <div className="flex items-center justify-center gap-3 pt-6">
            {["0G", "Gensyn AXL", "KeeperHub"].map((sp) => (
              <span key={sp} className="text-xs text-white/30 font-mono border border-white/10 rounded px-3 py-1">{sp}</span>
            ))}
          </div>
        </div>
      )}

      {/* Slide 1: Problem */}
      {slide === 1 && (
        <div key={animKey} className="max-w-4xl w-full space-y-10 animate-slideUp">
          <div className="flex items-baseline gap-4">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight">{s.title}</h2>
            <span className="text-5xl md:text-7xl font-black text-red-500 tracking-tight">{s.titleAccent}</span>
          </div>
          <div className="text-center p-10 rounded-2xl bg-red-500/5 border border-red-500/10 backdrop-blur-sm">
            <span className="text-6xl md:text-8xl font-black text-red-400 tracking-tighter">{s.stat}</span>
            <p className="text-red-300/60 mt-2 text-lg">{s.statLabel}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {s.cards?.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-red-500/20 transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="text-2xl">{c.icon}</span>
                <span className="text-white/70 text-sm md:text-base">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 2: After Every Exploit */}
      {slide === 2 && (
        <div key={animKey} className="max-w-3xl w-full space-y-12 animate-slideUp">
          <div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">{s.title} <span className="text-amber-400">{s.titleAccent}</span></h2>
            <p className="text-white/30 text-lg mt-2">{s.subtitle}</p>
          </div>
          <div className="relative pl-8 border-l-2 border-amber-500/20 space-y-6">
            {s.timeline?.map((t, i) => (
              <div key={i} className="relative pl-6 animate-slideUp" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="absolute left-[-25px] top-1.5 w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
                <span className="text-lg text-white/60">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 3: Solution */}
      {slide === 3 && (
        <div key={animKey} className="max-w-5xl w-full space-y-12 animate-slideUp">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">{s.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8734a] to-[#f4a261]">{s.titleAccent}</span></h2>
            <p className="text-2xl text-emerald-400 font-semibold tracking-wide">{s.tagline}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {s.agents?.map((a, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:border-[#e8734a]/30 hover:bg-white/[0.04] transition-all duration-500 text-center space-y-4" style={{ animationDelay: `${i * 200}ms` }}>
                <span className="text-7xl block group-hover:scale-110 transition-transform duration-500">{a.emoji}</span>
                <h3 className="text-xl font-bold text-white">{a.role}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[#e8734a]/60 font-mono text-sm">3 AI Agents · 1 Mission</p>
        </div>
      )}

      {/* Slide 4: How It Works */}
      {slide === 4 && (
        <div key={animKey} className="max-w-3xl w-full space-y-10 animate-slideUp">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">{s.title} <span className="text-sky-400">{s.titleAccent}</span></h2>
          <div className="space-y-3">
            {s.steps?.map((st, i) => (
              <div key={i} className="group flex items-center gap-5 p-4 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all duration-300 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="text-3xl font-black text-white/10 group-hover:text-[#e8734a]/60 transition-colors duration-500 min-w-[50px]">{st.num}</span>
                <span className="text-white/70 group-hover:text-white/90 transition-colors">{st.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 5: Architecture */}
      {slide === 5 && (
        <div key={animKey} className="max-w-3xl w-full space-y-8 animate-slideUp">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight text-center">{s.title}</h2>
          <div className="space-y-2">
            {s.arch?.map((layer, i) => (
              <div key={i} className={`rounded-xl border ${layer.color} bg-white/[0.01] backdrop-blur-sm p-4 animate-slideUp`} style={{ animationDelay: `${i * 120}ms` }}>
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-2 block">{layer.layer}</span>
                <div className="flex flex-wrap gap-2">
                  {layer.items.map((item, j) => (
                    <span key={j} className="text-sm text-white/70 bg-white/[0.03] rounded-lg px-3 py-1.5">{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 6: Built With */}
      {slide === 6 && (
        <div key={animKey} className="max-w-3xl w-full space-y-10 animate-slideUp">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight text-center">{s.title} <span className="text-purple-400">{s.titleAccent}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {s.sponsors?.map((sp, i) => (
              <div key={i} className={`p-6 rounded-xl border ${sp.color} text-center hover:scale-[1.02] transition-transform duration-300 animate-slideUp`} style={{ animationDelay: `${i * 80}ms` }}>
                <p className="font-bold text-base">{sp.name}</p>
                <p className="text-xs text-white/30 mt-1">{sp.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 7: Why JURI */}
      {slide === 7 && (
        <div key={animKey} className="max-w-3xl w-full space-y-10 animate-slideUp">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">{s.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8734a] to-[#f4a261]">{s.titleAccent}</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {s.reasons?.map((r, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[#e8734a]/20 transition-all duration-300 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="text-2xl mt-0.5">{r.icon}</span>
                <span className="text-white/70 text-sm">{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 8: CTA */}
      {slide === 8 && (
        <div key={animKey} className="text-center space-y-10 animate-slideUp">
          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter leading-none">
            <span className="text-white">{s.title}</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8734a] to-[#f4a261]">{s.titleAccent}</span>
          </h1>
          <p className="text-2xl md:text-3xl text-[#e8734a] font-semibold">{s.tagline}</p>
          <div className="flex items-center justify-center gap-4 pt-4">
            {s.tracks?.map((t) => (
              <span key={t} className="px-4 py-2 rounded-full border border-white/10 text-sm text-white/50 bg-white/[0.02]">{t}</span>
            ))}
          </div>
          <p className="text-white/20 text-sm font-mono pt-8">ETHGlobal Open Agents 2026</p>
        </div>
      )}

      {/* Bottom hint */}
      <div className="fixed bottom-6 left-0 right-0 text-center text-white/15 text-xs z-50 pointer-events-none">
        Click or → to advance · ← to go back
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
}
