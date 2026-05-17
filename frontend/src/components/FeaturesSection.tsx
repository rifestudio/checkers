import { useRef } from "react";
import { ScrollReveal } from "./ui/ScrollReveal";
import { GlowCard } from "./ui/GlowCard";
import { Zap, Users, Trophy, Brain, Globe, Sparkles } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-Time Multiplayer",
    description:
      "Challenge players from around the world in real-time matches with sub-50ms latency.",
  },
  {
    icon: Brain,
    title: "AI Opponents",
    description:
      "Train against our advanced AI with adjustable difficulty levels from beginner to grandmaster.",
  },
  {
    icon: Trophy,
    title: "Ranked System",
    description:
      "Climb the competitive ladder with our sophisticated ELO-based ranking system.",
  },
  {
    icon: Users,
    title: "Tournaments",
    description:
      "Participate in daily, weekly, and seasonal tournaments with exclusive rewards.",
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description:
      "Play seamlessly across web, iOS, Android, and desktop with cloud saves.",
  },
  {
    icon: Sparkles,
    title: "Customization",
    description:
      "Personalize your board, pieces, and profile with hundreds of unlockable cosmetics.",
  },
];

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    card.style.setProperty("--mouse-x", `${x}%`);
    card.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className="h-full">
      <GlowCard className="h-full p-8 group">
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors duration-300">
            <feature.icon className="w-7 h-7 text-orange-500" />
          </div>
        </div>

        <h3 className="font-orbitron text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-white/40 leading-relaxed">{feature.description}</p>
      </GlowCard>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 checker-pattern opacity-30" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <ScrollReveal>
            <span className="inline-block text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
              Features
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h2 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Why Players <span className="gradient-text">Love Us</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              Everything you need for the ultimate checkers experience, designed
              with passion for the game.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.1}>
              <FeatureCard feature={feature} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
