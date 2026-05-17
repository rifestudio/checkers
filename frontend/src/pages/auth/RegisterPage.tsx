import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  Gamepad2,
  Sparkles,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signUp } from "@/lib/auth";

// Same touch helper as on LoginPage — used to disable the expensive
// background effects (animated orbs, backdrop blur) on phones.
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

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const navigate = useNavigate();
  const isTouch = useIsTouchDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Step 1 just goes to step 2 — actual submit only happens on step 2.
      if (step === 1) {
        if (formData.password !== formData.confirmPassword) {
          alert("Passwords do not match");
          return;
        }
        if (formData.password.length < 6) {
          alert("Password must be at least 6 characters");
          return;
        }
        setStep(2);
        return;
      }

      setIsLoading(true);
      const { error } = await signUp(formData.username, formData.password);
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

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = passwordStrength(formData.password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Excellent"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-emerald-500",
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080808]">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      {!isTouch && (
        <>
          <div className="absolute inset-0 noise-overlay" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-3xl" />
          <motion.div
            className="absolute top-20 right-20 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"
            animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 left-20 w-48 h-48 bg-orange-500/5 rounded-full blur-2xl"
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

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-transparent opacity-50" />

          {/* Drop backdrop-blur on touch — biggest single source of input
              lag, especially on Android. */}
          <div
            className={`relative rounded-2xl border border-white/5 p-8 sm:p-10 ${
              isTouch ? "bg-[#0a0a0a]" : "bg-[#0a0a0a]/80 backdrop-blur-xl"
            }`}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-6 relative">
                <Gamepad2 className="w-8 h-8 text-orange-500" />
                {!isTouch && (
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                )}
              </div>
              <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-3">
                Join the Game
              </h1>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
                    step >= 1
                      ? "bg-orange-500 text-black"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  1
                </div>
                <div
                  className={`h-0.5 flex-1 transition-colors duration-200 ${
                    step >= 2 ? "bg-orange-500" : "bg-white/10"
                  }`}
                />
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
                    step >= 2
                      ? "bg-orange-500 text-black"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  2
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    {/* Username
                        Using :focus-within via Tailwind's group-focus-within
                        instead of a focusedField state — keeps focus styling
                        without re-rendering the whole form on every focus. */}
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Username
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none" />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                          placeholder="Your username"
                          className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors duration-200"
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
                          value={formData.password}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Create a strong password"
                          className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors duration-200"
                          autoComplete="new-password"
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

                      {/* Strength meter — static height, no layout animation
                          to avoid jumpy form when password is typed. */}
                      {formData.password && (
                        <div className="mt-3">
                          <div className="flex gap-1 mb-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                                  i < strength
                                    ? strengthColors[strength - 1]
                                    : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-white/40">
                            Strength:{" "}
                            <span
                              className={strength > 0 ? "text-orange-400" : ""}
                            >
                              {strengthLabels[strength]}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Confirm your password"
                          className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors duration-200"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-orange-500 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                        {formData.confirmPassword && (
                          <div className="absolute right-12 top-1/2 -translate-y-1/2">
                            {formData.password === formData.confirmPassword ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.agreeTerms}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                agreeTerms: e.target.checked,
                              }))
                            }
                          />
                          <div className="w-5 h-5 rounded border border-white/20 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-colors duration-200" />
                          <svg
                            className="absolute inset-0 w-5 h-5 text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors leading-relaxed">
                          I agree to the{" "}
                          <Link
                            to="/terms"
                            className="text-orange-500 hover:text-orange-400"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            to="/privacy"
                            className="text-orange-500 hover:text-orange-400"
                          >
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-white/60">
                        Account Summary
                      </h3>
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40">Username</span>
                          <span className="text-white">
                            {formData.username}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40">
                            Password Strength
                          </span>
                          <span
                            className={
                              strength > 0 ? "text-orange-400" : "text-white/40"
                            }
                          >
                            {strengthLabels[strength]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      &larr; Back to previous step
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 text-base glow-orange-strong"
                disabled={isLoading || (step === 2 && !formData.agreeTerms)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : step === 1 ? (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center mt-8 text-white/40">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-orange-500 hover:text-orange-400 font-semibold transition-colors inline-flex items-center gap-1 group"
              >
                Sign in
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
