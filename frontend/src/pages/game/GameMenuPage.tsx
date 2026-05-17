import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Shuffle,
  Bot,
  Crown,
  ArrowLeft,
  Swords,
  Zap,
  Brain,
  ChevronRight,
  Flame,
  Star,
  CheckCircle2,
  XCircle,
  History,
  Target,
  Gamepad2,
  Clock,
  Loader2,
} from "lucide-react";
import { createGame } from "@/lib/game";
import { useAuthStore } from "@/lib/authStore";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  wins: number;
  losses: number;
}

interface MatchRow {
  id: string;
  opponent: string;
  opponentInitials: string;
  result: "win" | "loss";
  moves: number;
  duration: string | null;
  date: string;
  inviteCode: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function avatarColor(username: string) {
  const colours = [
    "from-orange-500 to-orange-700",
    "from-purple-500 to-purple-700",
    "from-pink-500 to-pink-700",
    "from-blue-500 to-blue-700",
    "from-green-500 to-green-700",
    "from-red-500 to-red-700",
    "from-cyan-500 to-cyan-700",
    "from-amber-500 to-amber-700",
  ];
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return colours[hash % colours.length];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function computeDurationSeconds(
  createdAt: string,
  endedAt: string | null,
): number | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(createdAt).getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.floor(ms / 1000);
}

// ─── Static config ────────────────────────────────────────────────────────────

const gameModes = [
  {
    id: "friend",
    title: "Play with Friend",
    description: "Create a private room and invite your friend to play",
    icon: Users,
    color: "from-orange-500 to-orange-600",
    bgGlow: "bg-orange-500/10",
    action: "Create Room",
  },
  {
    id: "random",
    title: "Random Match",
    description: "Find a random opponent and start playing immediately",
    icon: Shuffle,
    color: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/10",
    action: "Find Match",
  },
  {
    id: "ai",
    title: "vs Computer",
    description: "Hover to pick a difficulty and play against the AI",
    icon: Bot,
    color: "from-red-500 to-orange-500",
    bgGlow: "bg-red-500/10",
    action: "Select Difficulty",
  },
];

const difficulties = [
  {
    level: "Beginner",
    description: "Perfect for learning",
    icon: Star,
    color: "text-green-400",
  },
  {
    level: "Intermediate",
    description: "A decent challenge",
    icon: Zap,
    color: "text-yellow-400",
  },
  {
    level: "Advanced",
    description: "For experienced players",
    icon: Brain,
    color: "text-orange-400",
  },
  {
    level: "Expert",
    description: "Master level AI",
    icon: Swords,
    color: "text-red-400",
  },
  {
    level: "Grandmaster",
    description: "Nearly unbeatable",
    icon: Crown,
    color: "text-purple-400",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function GameMenuPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const gateRanRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (gateRanRef.current) return;

    const ss = sessionStorage.getItem("from_pricing") === "1";
    const lsTs = parseInt(localStorage.getItem("from_pricing_at") ?? "0", 10);
    const fresh = Date.now() - lsTs < 5000;

    if (ss || fresh) {
      gateRanRef.current = true;
      sessionStorage.removeItem("from_pricing");
      localStorage.removeItem("from_pricing_at");
      return;
    }

    supabase
      .rpc("get_analysis_quota_status", { p_user_id: user.id })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.is_pro) {
          gateRanRef.current = true;
          return;
        }
        gateRanRef.current = true;
        navigate("/pricing", { replace: true });
      });
  }, [user, navigate]);

  const [isCreating, setIsCreating] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, username, avatar_url, rating, wins, losses")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
        setLoadingProfile(false);
      });
  }, [user]);

  // ── Fetch match history ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoadingMatches(true);

      const { data: games, error } = await supabase
        .from("games")
        .select(
          `
          id,
          invite_code,
          white_player,
          black_player,
          winner,
          move_count,
          created_at,
          ended_at,
          white_player_profile:profiles!games_white_player_fkey (id, username),
          black_player_profile:profiles!games_black_player_fkey (id, username)
        `,
        )
        .eq("status", "finished")
        .or(`white_player.eq.${user.id},black_player.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !games) {
        setLoadingMatches(false);
        return;
      }

      const rows: MatchRow[] = games.map((g: any) => {
        const iAmWhite = g.white_player === user.id;
        const opponentProfile = iAmWhite
          ? g.black_player_profile
          : g.white_player_profile;
        const opponentName = opponentProfile?.username ?? "Unknown";
        const iWon = g.winner === user.id;

        const durationSeconds = computeDurationSeconds(
          g.created_at,
          g.ended_at ?? null,
        );

        return {
          id: g.id,
          opponent: opponentName,
          opponentInitials: initials(opponentName),
          result: iWon ? "win" : "loss",
          moves: g.move_count ?? 0,
          duration: formatDuration(durationSeconds),
          date: timeAgo(g.created_at),
          inviteCode: g.invite_code,
        };
      });

      setMatches(rows);
      setLoadingMatches(false);
    }

    load();
  }, [user]);

  const totalGames = (profile?.wins ?? 0) + (profile?.losses ?? 0);
  const winRate =
    totalGames > 0 ? Math.round(((profile?.wins ?? 0) / totalGames) * 100) : 0;

  const currentStreak = (() => {
    if (!matches.length) return 0;
    let streak = 0;
    const first = matches[0].result;
    for (const m of matches) {
      if (m.result !== first) break;
      streak++;
    }
    return first === "win" ? streak : -streak;
  })();

  const handleCreateGame = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const { data, error } = await createGame(user.id, { isPublic: false });
      if (error || !data) {
        console.error(error);
        return;
      }
      navigate(`/game/${data.invite_code}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRandomMatch = async () => {
    if (!user || isMatching) return;
    setIsMatching(true);
    try {
      const { data: matchedCode, error: rpcError } = await supabase.rpc(
        "find_random_match",
        { p_user_id: user.id },
      );

      if (rpcError) {
        console.error("Matchmaking RPC failed:", rpcError);
        return;
      }

      if (matchedCode) {
        navigate(`/game/${matchedCode}`);
        return;
      }

      const { data, error } = await createGame(user.id, { isPublic: true });
      if (error || !data) {
        console.error(error);
        return;
      }
      navigate(`/game/${data.invite_code}`);
    } catch (err) {
      console.error("Random match failed:", err);
    } finally {
      setIsMatching(false);
    }
  };

  // ── Render helper for action-button modes (friend, random) ─────────────────
  // Notes on performance:
  //   - Removed the wrapping motion.div with whileHover/whileTap. Three of
  //     these on screen meant Framer Motion did layout work on every cursor
  //     enter/leave. CSS hover via group-hover does the same scale via
  //     transform — GPU-only, no React work.
  //   - transition-colors + transition-transform: avoid transition-all which
  //     animates every changing CSS property and over-paints.
  function renderButtonCard(
    mode: (typeof gameModes)[number],
    onClick: () => void,
    busy: boolean,
    busyLabel: string,
  ) {
    return (
      <button
        onClick={onClick}
        disabled={busy}
        className="group relative w-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-70
          transition-transform duration-200 ease-out
          hover:scale-[1.02] active:scale-[0.98]"
      >
        <div
          className={`absolute -inset-px rounded-2xl bg-gradient-to-b ${mode.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm pointer-events-none`}
        />
        <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 h-full transition-colors duration-300 group-hover:border-orange-500/20 overflow-hidden">
          <div
            className={`absolute -top-20 -right-20 w-40 h-40 ${mode.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
          />
          <div className="relative z-10">
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-6 shadow-lg`}
            >
              {busy ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <mode.icon className="w-8 h-8 text-white" />
              )}
            </div>
            <h3 className="font-orbitron text-2xl font-bold text-white mb-3 transition-colors group-hover:text-orange-400">
              {mode.title}
            </h3>
            <p className="text-white/40 mb-6 leading-relaxed">
              {mode.description}
            </p>
            <div className="flex items-center gap-2 text-orange-500 font-semibold">
              <span>{busy ? busyLabel : mode.action}</span>
              {!busy && <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#080808] overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute inset-0 noise-overlay" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-white/40 hover:text-orange-500 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <Crown className="w-6 h-6" />
          <span className="font-orbitron text-sm font-bold tracking-wider">
            TEMPO
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {loadingProfile ? (
            <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
          ) : profile ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02]">
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(profile.username)} flex items-center justify-center text-xs font-bold text-white`}
              >
                {initials(profile.username)}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">
                  {profile.username}
                </div>
                <div className="text-xs text-orange-500 font-orbitron">
                  Rating: {profile.rating.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/20">{user?.email}</div>
          )}
        </div>
      </motion.header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h1 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Choose Your <span className="gradient-text">Battle</span>
          </h1>
          <p className="text-white/40 text-lg">Select a game mode to begin</p>
        </motion.div>

        {/* Game Mode Cards
            Container is `relative` and `items-start` so the AI difficulty
            popup can be absolutely positioned and not push other cards down.
            The popup is rendered inside the AI card with `group-hover` —
            no JS state, no AnimatePresence. */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 items-start">
          {gameModes.map((mode) => {
            if (mode.id === "friend") {
              return (
                <div key={mode.id}>
                  {renderButtonCard(
                    mode,
                    handleCreateGame,
                    isCreating,
                    "Creating Room…",
                  )}
                </div>
              );
            }

            if (mode.id === "random") {
              return (
                <div key={mode.id}>
                  {renderButtonCard(
                    mode,
                    handleRandomMatch,
                    isMatching,
                    "Searching…",
                  )}
                </div>
              );
            }

            // AI card. The difficulty list is a sibling absolutely-positioned
            // panel that becomes visible on hover/focus-within of the parent
            // .group container. A small invisible bridge keeps the panel
            // alive while the cursor crosses the gap between card and list.
            return (
              <div key={mode.id} className="group relative">
                <div className="relative cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.02]">
                  <div
                    className={`absolute -inset-px rounded-2xl bg-gradient-to-b ${mode.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm pointer-events-none`}
                  />
                  <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-colors duration-300 group-hover:border-orange-500/20 overflow-hidden">
                    <div
                      className={`absolute -top-20 -right-20 w-40 h-40 ${mode.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                    />
                    <div className="relative z-10">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-6 shadow-lg`}
                      >
                        <mode.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-orbitron text-2xl font-bold text-white mb-3 transition-colors group-hover:text-orange-400">
                        {mode.title}
                      </h3>
                      <p className="text-white/40 mb-6 leading-relaxed">
                        {mode.description}
                      </p>
                      <div className="flex items-center gap-2 text-orange-500 font-semibold">
                        <span>{mode.action}</span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difficulty list — CSS-only show/hide via group-hover.
                    pointer-events-none until visible so the absolutely-
                    positioned overlay doesn't trap clicks meant for content
                    below. The `top-full pt-4` setup creates a hover bridge
                    so moving the cursor from card to list keeps it open. */}
                <div
                  className="absolute left-0 right-0 top-full pt-4 z-20
                    opacity-0 pointer-events-none translate-y-1
                    group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0
                    transition-[opacity,transform] duration-200"
                >
                  <div className="space-y-2">
                    {difficulties.map((diff) => (
                      <Link
                        to={`/game/ai/${diff.level.toLowerCase()}`}
                        key={diff.level}
                      >
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-[#0a0a0a]/95 backdrop-blur-sm hover:bg-white/[0.05] hover:border-orange-500/20 cursor-pointer transition-colors">
                          <diff.icon className={`w-5 h-5 ${diff.color}`} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white">
                              {diff.level}
                            </div>
                            <div className="text-xs text-white/30">
                              {diff.description}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {[
            {
              label: "Total Games",
              value: loadingProfile ? "—" : totalGames,
              icon: Gamepad2,
              color: "",
            },
            {
              label: "Wins",
              value: loadingProfile ? "—" : (profile?.wins ?? 0),
              icon: CheckCircle2,
              color: "text-green-500",
            },
            {
              label: "Losses",
              value: loadingProfile ? "—" : (profile?.losses ?? 0),
              icon: XCircle,
              color: "text-red-500",
            },
            {
              label: "Win Rate",
              value: loadingProfile ? "—" : `${winRate}%`,
              icon: Target,
              color: "text-orange-500",
            },
            {
              label: "Streak",
              value: loadingProfile ? "—" : Math.abs(currentStreak),
              icon: Flame,
              color: currentStreak >= 0 ? "text-orange-500" : "text-red-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center"
            >
              <stat.icon
                className={`w-5 h-5 mx-auto mb-2 ${stat.color || "text-white/40"}`}
              />
              <div className="font-orbitron text-xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-xs text-white/30 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Match History */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="font-orbitron text-2xl font-bold text-white">
                Match History
              </h2>
              <p className="text-sm text-white/40">Your recent games</p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[560px] rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              {loadingMatches ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-16 text-white/20 text-sm">
                  No games played yet
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-white/40 font-medium uppercase tracking-wider">
                      <th className="px-4 py-3 text-center">Opponent</th>
                      <th className="px-4 py-3 text-center">Result</th>
                      <th className="px-4 py-3 text-center">Moves</th>
                      <th className="px-4 py-3 text-center">Duration</th>
                      <th className="px-4 py-3 text-center">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr
                        key={match.id}
                        onClick={() => navigate(`/game/${match.inviteCode}`)}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(match.opponent)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                            >
                              {match.opponentInitials}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="text-sm font-medium text-white truncate group-hover:text-orange-400 transition-colors">
                                {match.opponent}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              match.result === "win"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {match.result === "win" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Win
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> Loss
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-white/60">
                            {match.moves}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1 text-sm text-white/40">
                            <Clock className="w-3 h-3" />
                            {match.duration ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-white/30">
                            {match.date}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
