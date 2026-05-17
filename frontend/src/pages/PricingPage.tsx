import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Brain,
  Infinity as InfinityIcon,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { getQuotaStatus, QuotaStatus } from "@/lib/asiAnalysis";

// Gumroad permalink — same URL used in the product page (`/l/tempo`).
// When you change the product slug, update this constant. We pass the user
// id as a query param so the webhook can tie the purchase to the right user.
const GUMROAD_URL = "https://raifshnaider.gumroad.com/l/tempo";

const features = [
  {
    icon: Brain,
    title: "AI move explanations",
    description:
      "Get a natural-language coach explaining every move in your game history",
  },
  {
    icon: InfinityIcon,
    title: "Unlimited daily analysis",
    description: "Free users get 1 analysis per day. Pro users have no limits.",
  },
  {
    icon: Sparkles,
    title: "Support an indie project",
    description: "Cancel anytime through Gumroad.",
  },
];

export function PricingPage() {
  const { user } = useAuthStore();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const handleBackToMenu = () => {
    console.log("[pricing] back to menu, setting flags");

    sessionStorage.setItem("from_pricing", "1");
    localStorage.setItem("from_pricing_at", String(Date.now()));

    navigate("/menu");
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getQuotaStatus(user.id).then((q) => {
      setQuota(q);
      setLoading(false);
    });
  }, [user]);

  const isPro = quota?.is_pro === true;

  const checkoutUrl = user
    ? `${GUMROAD_URL}?user_id=${encodeURIComponent(user.id)}&wanted=true`
    : GUMROAD_URL;

  return (
    <div className="relative min-h-screen bg-[#080808] overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />

      <motion.header
        className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={handleBackToMenu}
          className="flex items-center gap-2 text-white/40 hover:text-orange-500 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <Crown className="w-6 h-6" />
          <span className="font-orbitron text-sm font-bold tracking-wider">
            TEMPO
          </span>
        </button>
      </motion.header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-orbitron text-4xl sm:text-5xl font-bold text-white mb-4">
            Unlock <span className="gradient-text">Pro</span>
          </h1>
          <p className="text-white/40 text-lg">
            One simple plan. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.06] to-white/[0.02] p-8 sm:p-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-orange-500" />
                <span className="font-orbitron text-sm font-bold text-orange-500 tracking-wider">
                  TEMPO PRO
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-orbitron text-5xl font-bold text-white">
                  $7
                </span>
                <span className="text-white/40">/ month</span>
              </div>
            </div>

            {isPro && (
              <div className="px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">
                  You're a Pro
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm mb-0.5">
                    {f.title}
                  </div>
                  <div className="text-white/40 text-sm">{f.description}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
            </div>
          ) : isPro ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
              <p className="text-white/60 text-sm mb-2">
                Manage your subscription in your{" "}
                <a
                  href="https://gumroad.com/library"
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-400 hover:text-orange-300 underline"
                >
                  Gumroad Library
                </a>
                .
              </p>
            </div>
          ) : (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center px-6 py-4 rounded-xl bg-orange-500 text-black font-bold font-orbitron hover:bg-orange-400 transition-colors text-sm tracking-wider"
            >
              SUBSCRIBE — $7 / MONTH
            </a>
          )}

          <p className="text-xs text-white/30 text-center mt-4">
            Payments processed by Gumroad. After purchase, return to the app —
            your account will upgrade within seconds.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid sm:grid-cols-2 gap-4 text-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="font-semibold text-white mb-1 flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-500" /> Free forever
            </div>
            <p className="text-white/40 text-xs">
              Multiplayer, AI opponent, basic engine analysis with score
              comparison — all free.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <div className="font-semibold text-white mb-1 flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-500" /> Cancel anytime
            </div>
            <p className="text-white/40 text-xs">
              Manage from your Gumroad Library. No long-term commitment.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
