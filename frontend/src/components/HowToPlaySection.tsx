import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ScrollReveal } from "./ui/ScrollReveal";
import { ArrowRight, Target, Shield, Crown, Swords } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Target,
    title: "Set Up",
    description:
      "Each player starts with 12 pieces on the dark squares of the first three rows. Black moves first.",
  },
  {
    number: "02",
    icon: ArrowRight,
    title: "Move",
    description:
      "Pieces move diagonally forward one square at a time. You can only move to unoccupied dark squares.",
  },
  {
    number: "03",
    icon: Swords,
    title: "Capture",
    description:
      "Jump over opponent pieces diagonally to capture them. Multiple captures in a single turn are allowed.",
  },
  {
    number: "04",
    icon: Shield,
    title: "King Me",
    description:
      "Reach the opposite end of the board to crown your piece. Kings can move backward and forward.",
  },
  {
    number: "05",
    icon: Crown,
    title: "Win",
    description:
      "Capture all opponent pieces or block them from making any legal moves to win the game.",
  },
];

export function HowToPlaySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 0.8], ["0%", "100%"]);

  return (
    <section
      id="how-to-play"
      className="relative py-32 overflow-hidden"
      ref={containerRef}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <ScrollReveal>
            <span className="inline-block text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
              How to Play
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h2 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Master the <span className="gradient-text">Game</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              Learn the fundamentals and become a checkers champion in minutes.
            </p>
          </ScrollReveal>
        </div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Progress Line */}
          <div className="absolute hidden md:block md:left-1/2 top-0 bottom-0 w-px bg-white/5 md:-translate-x-px">
            <motion.div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-orange-500 to-orange-500/50"
              style={{ height: lineHeight }}
            />
          </div>

          {steps.map((step, index) => (
            <ScrollReveal
              key={step.number}
              delay={index * 0.15}
              direction={index % 2 === 0 ? "left" : "right"}
            >
              <div
                className={`relative flex items-start gap-8 mb-16 last:mb-0 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content */}
                <div
                  className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}
                >
                  <div
                    className={`inline-flex items-center gap-3 mb-4 ${
                      index % 2 === 0 ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <span className="font-orbitron text-5xl font-black text-orange-500/20">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="font-orbitron text-2xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-white/40 leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>

                {/* Center dot */}
                <div className="relative z-10 flex-shrink-0 hidden md:block">
                  <motion.div
                    className="w-4 h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"
                    whileInView={{ scale: [0, 1.2, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
