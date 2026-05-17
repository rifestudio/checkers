import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  Gamepad2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signIn } from "@/lib/auth";

// Touch / coarse-pointer detection. Same approach we use on the board:
// on touch devices we strip heavyweight visual effects (blurs, animated
// orbs) that hurt typing latency.
function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        ("ontouchstart" in window ||
          (!!window.matchMedia &&
            window.matchMedia("(pointer: coarse)").matches)),
    );
  }, []);
  return isTouch;
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const isTouch = useIsTouchDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const { error } = await signIn(username, password);
      if (error) {
        alert(error.message);
        return;
      }
      navigate("/menu");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080808]">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      {/* Heavy effects only on non-touch devices — the orbs and blurs make
          input lag noticeably on phones because they keep the GPU busy. */}
      {!isTouch && (
        <>
          <div className="absolute inset-0 noise-overlay" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-3xl" />
          <motion.div
            className="absolute top-20 left-20 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"
            animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl"
            animate={{ y: [0, 20, 0], scale: [1, 1.2, 1] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </>
      )}

      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-transparent opacity-50" />

          {/* Card: drop backdrop-blur-xl on touch — it gets re-evaluated on
              every input change and was the main cause of typing lag. */}
          <div
            className={`relative rounded-2xl border border-white/5 p-8 sm:p-10 ${
              isTouch ? "bg-[#0a0a0a]" : "bg-[#0a0a0a]/80 backdrop-blur-xl"
            }`}
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-6 relative">
                <Gamepad2 className="w-8 h-8 text-orange-500" />
                {!isTouch && (
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                )}
              </div>
              <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-3">
                Welcome Back
              </h1>
              <p className="text-white/40">Sign in to continue your journey</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username
                  Notes on the input styling:
                  - icon color uses :has(input:focus) so we don't need a JS
                    focusedField state, which would re-render the whole form
                    on every focus/blur.
                  - transition-colors not transition-all — limits what
                    actually animates and saves GPU work per keystroke. */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Username
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20
                      focus:outline-none focus:border-orange-500/50
                      transition-colors duration-200"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20
                      focus:outline-none focus:border-orange-500/50
                      transition-colors duration-200"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-orange-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 text-base glow-orange-strong"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center mt-8 text-white/40">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="text-orange-500 hover:text-orange-400 font-semibold transition-colors inline-flex items-center gap-1 group"
              >
                Create one
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
