"use client";
import { useState } from "react";

const slides = [
  {
    id: 0,
    title: "JURI Protocol",
    subtitle: "DeFi Exploit Forensics & Cross-Chain Knowledge Base",
    tag: "ETHGlobal Open Agents 2026",
    bg: "from-[#0a0a0f] via-[#1a1020] to-[#0a0a0f]",
  },
  {
    id: 1,
    title: "The Problem",
    stat: "$3,000,000,000+",
    statLabel: "Lost to DeFi exploits since 2024",
    bullets: [
      "No standardized post-mortem process",
      "Evidence scattered across Twitter & Discord",
      "Same exploits repeat — protocols never learn",
      "Cross-chain attacks even harder to trace",
    ],
    bg: "from-[#0a0a0f] via-[#200808] to-[#0a0a0f]",
    color: "text-red-400",
  },
  {
    id: 2,
    title: "After Every Exploit...",
    subtitle: "This is what happens now",
    points: [
      { emoji: "🐦", text: "Twitter wars — protocol vs attacker vs community" },
      { emoji: "📋", text: "No standardized evidence collection" },
      { emoji: "⏰", text: "Weeks of manual investigation" },
      { emoji: "🔁", text: "Same attack vector exploits another protocol next week" },
    ],
    bg: "from-[#0a0a0f] via-[#201808] to-[#0a0a0f]",
  },
  {
    id: 3,
    title: "Introducing JURI Protocol",
    subtitle: "Exploit Once. Learn Forever.",
    points: [
      { emoji: "🔍", text: "Forensic Agent traces fund flows across chains" },
      { emoji: "📊", text: "Analysis Agent classifies attack vector & severity" },
      { emoji: "✅", text: "Verification Agent cross-references & publishes post-mortem" },
    ],
    bg: "from-[#0a0a0f] via-[#102008] to-[#0a0a0f]",
    color: "text-green-400",
  },
  {
    id: 4,
    title: "How It Works",
    steps: [
      "1. Exploit detected → JURI activates",
      "2. Forensic Agent collects on-chain evidence → 0G Storage",
      "3. Analysis Agent classifies attack → matches historical patterns",
      "4. Verification Agent cross-references → 0G Compute TEE",
      "5. Immutable post-mortem published → 0G Chain",
      "6. Every protocol learns → same exploit never works twice",
    ],
    bg: "from-[#0a0a0f] via-[#101830] to-[#0a0a0f]",
  },
  {
    id: 5,
    title: "Architecture",
    bg: "from-[#0a0a0f] via-[#101020] to-[#0a0a0f]",
  },
  {
    id: 6,
    title: "Built With",
    bg: "from-[#0a0a0f] via-[#181010] to-[#0a0a0f]",
  },
  {
    id: 7,
    title: "Why JURI",
    bullets: [
      "Immutable evidence — 0G Storage ensures tamper-proof audit trail",
      "Verifiable reasoning — 0G Compute TEE-signed inference",
      "Encrypted P2P — Gensyn AXL for agent communication",
      "Auto-execution — KeeperHub for on-chain actions",
      "Cross-chain — traces funds across EVM + alt chains",
      "Public good — open knowledge base for all protocols",
    ],
    bg: "from-[#0a0a0f] via-[#1a1020] to-[#0a0a0f]",
    color: "text-[#c9a84c]",
  },
  {
    id: 8,
    title: "JURI Protocol",
    subtitle: "Exploit Once. Learn Forever.",
    bg: "from-[#0a0a0f] via-[#102020] to-[#0a0a0f]",
  },
];

export default function PitchPage() {
  const [slide, setSlide] = useState(0);
  const total = slides.length;
  const s = slides[slide];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${s.bg} flex flex-col items-center justify-center p-8 transition-all duration-700`}
      onClick={() => setSlide((s) => Math.min(s + 1, total - 1))}
    >
      {/* Nav dots */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setSlide(i); }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? "bg-[#c9a84c] w-6" : "bg-gray-600 hover:bg-gray-400"}`}
          />
        ))}
      </div>
      <div className="fixed top-4 right-4 text-gray-500 text-xs z-50">{slide + 1} / {total}</div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-gray-600 text-xs z-50">Click anywhere or use ← → keys to navigate</div>

      {/* Slide 0 */}
      {s.id === 0 && (
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-sm mb-4">{s.tag}</div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
            <span className="text-white">JURI</span>{" "}
            <span className="text-[#c9a84c]">Protocol</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">{s.subtitle}</p>
          <div className="flex items-center justify-center gap-4 pt-8">
            <span className="text-green-400 text-sm font-mono">0G</span>
            <span className="text-gray-700">·</span>
            <span className="text-purple-400 text-sm font-mono">Gensyn AXL</span>
            <span className="text-gray-700">·</span>
            <span className="text-orange-400 text-sm font-mono">KeeperHub</span>
          </div>
        </div>
      )}

      {/* Slide 1 */}
      {s.id === 1 && (
        <div className="max-w-3xl space-y-8 animate-fadeIn">
          <h2 className="text-6xl font-bold text-white">The <span className="text-red-400">Problem</span></h2>
          <div className="text-center py-6">
            <span className="text-8xl font-bold text-red-400">{s.stat}</span>
            <p className="text-gray-500 mt-2 text-lg">{s.statLabel}</p>
          </div>
          <ul className="space-y-3">
            {s.bullets?.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300 text-lg"><span className="text-red-400 mt-1">✦</span> {b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Slide 2 */}
      {s.id === 2 && (
        <div className="max-w-3xl space-y-10 animate-fadeIn">
          <h2 className="text-6xl font-bold text-white">{s.title}</h2>
          <p className="text-gray-500 text-lg">{s.subtitle}</p>
          <div className="grid gap-4">
            {s.points?.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-lg border border-white/10 hover:border-[#c9a84c]/30 transition-colors">
                <span className="text-3xl">{p.emoji}</span>
                <span className="text-gray-300 text-lg">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 3 */}
      {s.id === 3 && (
        <div className="max-w-4xl space-y-10 animate-fadeIn">
          <h2 className="text-6xl font-bold text-white"><span className="text-[#c9a84c]">Introducing</span> JURI Protocol</h2>
          <p className="text-2xl text-green-400 font-semibold">{s.subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {s.points?.map((p, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-lg border border-white/10 text-center space-y-3 hover:border-[#c9a84c]/30 transition-all">
                <span className="text-6xl">{p.emoji}</span>
                <p className="text-gray-200 font-semibold text-lg">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center pt-4"><span className="text-[#c9a84c] text-lg font-mono">3 AI Agents. 1 Mission: Never exploit twice.</span></div>
        </div>
      )}

      {/* Slide 4 */}
      {s.id === 4 && (
        <div className="max-w-3xl space-y-8 animate-fadeIn">
          <h2 className="text-6xl font-bold text-white">{s.title}</h2>
          <div className="space-y-3">
            {s.steps?.map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 hover:border-[#c9a84c]/20 transition-all">
                <span className="text-[#c9a84c] font-bold text-xl min-w-[30px]">{i + 1}</span>
                <span className="text-gray-300 text-lg">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 5: Architecture */}
      {s.id === 5 && (
        <div className="max-w-4xl space-y-8 animate-fadeIn w-full">
          <h2 className="text-6xl font-bold text-white text-center">{s.title}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "🔍", name: "Forensic", desc: "Trace funds\nStore evidence", color: "border-blue-500/30 bg-blue-500/5" },
              { icon: "📊", name: "Analysis", desc: "Classify attack\nScore severity", color: "border-purple-500/30 bg-purple-500/5" },
              { icon: "✅", name: "Verification", desc: "Cross-reference\n0G Compute TEE", color: "border-green-500/30 bg-green-500/5" },
            ].map((a, i) => (
              <div key={i} className={`p-6 rounded-lg border ${a.color} space-y-3`}>
                <span className="text-5xl">{a.icon}</span>
                <p className="text-white font-bold text-lg">{a.name}</p>
                <p className="text-gray-400 text-sm whitespace-pre-line">{a.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm pt-4">
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded font-mono">AXL P2P Encrypted</span>
            <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded font-mono">KeeperHub Execute</span>
            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded font-mono">0G Storage</span>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded font-mono">0G Compute</span>
          </div>
          <div className="text-center text-gray-600 text-xs">All evidence immutable on 0G Storage · Verdict on 0G Chain</div>
        </div>
      )}

      {/* Slide 6: Built With */}
      {s.id === 6 && (
        <div className="max-w-3xl space-y-10 animate-fadeIn w-full">
          <h2 className="text-6xl font-bold text-white text-center">{s.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "0G Chain", color: "text-green-400 bg-green-500/5 border-green-500/20" },
              { name: "0G Storage", color: "text-green-400 bg-green-500/5 border-green-500/20" },
              { name: "0G Compute", color: "text-blue-400 bg-blue-500/5 border-blue-500/20" },
              { name: "Gensyn AXL", color: "text-purple-400 bg-purple-500/5 border-purple-500/20" },
              { name: "KeeperHub", color: "text-orange-400 bg-orange-500/5 border-orange-500/20" },
              { name: "Solidity", color: "text-gray-400 bg-gray-500/5 border-gray-500/20" },
            ].map((sp, i) => (
              <div key={i} className={`p-4 rounded-lg border ${sp.color} text-center`}>
                <p className="font-bold">{sp.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide 7 */}
      {s.id === 7 && (
        <div className="max-w-3xl space-y-8 animate-fadeIn">
          <h2 className="text-6xl font-bold text-white">Why <span className="text-[#c9a84c]">JURI</span></h2>
          <ul className="space-y-4">
            {s.bullets?.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300 text-lg"><span className="text-[#c9a84c] mt-1">◆</span> {b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Slide 8: CTA */}
      {s.id === 8 && (
        <div className="text-center space-y-10 animate-fadeIn">
          <h1 className="text-7xl md:text-8xl font-bold tracking-tight">
            <span className="text-white">JURI</span>{" "}
            <span className="text-[#c9a84c]">Protocol</span>
          </h1>
          <p className="text-3xl text-[#c9a84c] font-semibold">{s.subtitle}</p>
          <div className="flex items-center justify-center gap-6 pt-6">
            <span className="text-gray-500 text-sm">ETHGlobal Open Agents 2026</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm pt-4">
            <span className="text-green-400">0G Autonomous Agents</span>
            <span className="text-gray-700">·</span>
            <span className="text-purple-400">Gensyn AXL</span>
            <span className="text-gray-700">·</span>
            <span className="text-orange-400">KeeperHub</span>
          </div>
        </div>
      )}

      {/* Nav arrows */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
        <button onClick={(e) => { e.stopPropagation(); setSlide(s => Math.max(s - 1, 0)); }} className="text-gray-500 hover:text-white text-3xl transition-colors">←</button>
        <button onClick={(e) => { e.stopPropagation(); setSlide(s => Math.min(s + 1, total - 1)); }} className="text-gray-500 hover:text-white text-3xl transition-colors">→</button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
      `}</style>
    </div>
  );
}
