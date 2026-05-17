import { motion } from "framer-motion";
import { ScrollReveal } from "./ui/ScrollReveal";
import { Button } from "./ui/Button";
import {
  Apple,
  Play,
  Monitor,
  Gamepad2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const platforms = [
  { icon: Apple, name: "iOS & MacOS" },
  { icon: Play, name: "Android" },
  { icon: Monitor, name: "Windows" },
  // { icon: Gamepad2, name: "Steam", description: "Windows & macOS" },
];

export function DownloadSection() {
  const navigate = useNavigate();

  return (
    <section id="download" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.1)_0%,_transparent_70%)]" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <ScrollReveal>
              <span className="inline-block text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
                Get Started
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Ready to <span className="gradient-text">Play?</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-lg text-white/40 mb-10 leading-relaxed max-w-lg">
                Play checkers directly in your browser — challenge anyone,
                anywhere, anytime.
              </p>
            </ScrollReveal>

            {/* Platform Cards */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {platforms.map((platform, index) => (
                <ScrollReveal key={platform.name} delay={0.3 + index * 0.1}>
                  <motion.div
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-orange-500/30 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <platform.icon className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                        {platform.name}
                      </div>
                      <div className="text-sm text-white/30">
                        {platform.description}
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>

            {/* CTA */}
            <ScrollReveal delay={0.7}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="gap-2 text-base glow-orange-strong animate-pulse-glow"
                  onClick={() => navigate("/menu")}
                >
                  <Sparkles className="w-5 h-5" />
                  Play Free Now
                </Button>
                {/* <Button variant="outline" size="lg" className="gap-2 text-base">
                  Learn More
                  <ArrowRight className="w-5 h-5" />
                </Button> */}
              </div>
            </ScrollReveal>
          </div>

          {/* Right - Decorative Board Preview */}
          <ScrollReveal delay={0.3} direction="right">
            <div className="relative">
              {/* 3D-like board preview */}
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Board */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/10 border border-white/5"
                  style={{
                    transform:
                      "perspective(1000px) rotateX(15deg) rotateY(-5deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Checkerboard pattern */}
                  <div className="grid grid-cols-8 w-full h-full">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const row = Math.floor(i / 8);
                      const col = i % 8;
                      const isDark = (row + col) % 2 === 1;
                      return (
                        <div
                          key={i}
                          className={`relative ${isDark ? "bg-[#1a1a1a]" : "bg-[#2a2a2a]"}`}
                        >
                          {/* Pieces */}
                          {isDark && row < 3 && (
                            <motion.div
                              className="absolute inset-1 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg"
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.01, type: "spring" }}
                            />
                          )}
                          {isDark && row > 4 && (
                            <motion.div
                              className="absolute inset-1 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-lg"
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.01, type: "spring" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Glow effect */}
                <div className="absolute -inset-4 bg-orange-500/10 blur-3xl rounded-full -z-10" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
