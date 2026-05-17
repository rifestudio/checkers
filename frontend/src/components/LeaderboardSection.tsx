import { motion } from "framer-motion";
import { ScrollReveal } from "./ui/ScrollReveal";
import { AnimatedCounter } from "./ui/AnimatedCounter";
import { Crown, Medal, Award, TrendingUp, Flame } from "lucide-react";

const topPlayers = [
  {
    rank: 1,
    name: "GrandMaster_X",
    rating: 2847,
    wins: 1247,
    streak: 23,
    country: "US",
    avatar: "GM",
  },
  {
    rank: 2,
    name: "QueenSlayer",
    rating: 2793,
    wins: 1089,
    streak: 15,
    country: "KR",
    avatar: "QS",
  },
  {
    rank: 3,
    name: "KingTakesAll",
    rating: 2756,
    wins: 956,
    streak: 12,
    country: "RU",
    avatar: "KT",
  },
  {
    rank: 4,
    name: "CheckMate_Pro",
    rating: 2712,
    wins: 823,
    streak: 8,
    country: "DE",
    avatar: "CM",
  },
  {
    rank: 5,
    name: "BoardMaster",
    rating: 2689,
    wins: 745,
    streak: 6,
    country: "BR",
    avatar: "BM",
  },
];

const stats = [
  { label: "Total Games", value: 12500000, suffix: "+" },
  { label: "Active Players", value: 2100000, suffix: "+" },
  { label: "Tournaments", value: 850, suffix: "" },
  { label: "Countries", value: 142, suffix: "" },
];

export function LeaderboardSection() {
  return (
    <section id="leaderboard" className="relative py-32 overflow-y-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 checker-pattern opacity-30" />

      {/* Decorative */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-orange-500/3 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <ScrollReveal>
            <span className="inline-block text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
              Leaderboard
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Top <span className="gradient-text">Players</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              Compete with the best players from around the world and claim your
              spot on the leaderboard.
            </p>
          </ScrollReveal>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.1}>
              <div className="relative p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center group hover:border-orange-500/20 transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                <div className="relative z-10">
                  <div className="font-orbitron text-3xl sm:text-4xl font-bold text-orange-500 mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-white/40">{stat.label}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Table — overflow-x-auto снаружи ScrollReveal */}
        <div className="w-full overflow-x-auto pb-2">
          <ScrollReveal>
            {/* pr-6 на внутреннем div — padding-right на overflow контейнере игнорируется браузером */}
            <div className="min-w-[650px] pr-6 rounded-2xl border border-white/5 bg-white/[0.02] overflow-x-hidden overflow-y-visible">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-sm text-white/40 font-medium">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Player</div>
                <div className="col-span-2 text-left">Rating</div>
                <div className="col-span-2 text-left">Wins</div>
                <div className="col-span-2 text-left">Streak</div>
                <div className="col-span-1 text-left">Status</div>
              </div>

              {/* Rows */}
              {topPlayers.map((player, index) => (
                <motion.div
                  key={player.name}
                  className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-white/5 items-center group hover:bg-white/[0.03] transition-colors duration-300 cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 0.995 }}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    {player.rank === 1 ? (
                      <Crown className="w-6 h-6 text-yellow-500" />
                    ) : player.rank === 2 ? (
                      <Medal className="w-6 h-6 text-gray-400" />
                    ) : player.rank === 3 ? (
                      <Award className="w-6 h-6 text-amber-700" />
                    ) : (
                      <span className="font-orbitron text-lg text-white/30">
                        {player.rank}
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {player.avatar}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <div className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-white/30">
                        {player.country}
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="col-span-2 text-left">
                    <div className="font-orbitron text-lg font-bold text-orange-500">
                      {player.rating.toLocaleString()}
                    </div>
                  </div>

                  {/* Wins */}
                  <div className="col-span-2 text-left">
                    <div className="text-white/60">
                      {player.wins.toLocaleString()}
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="col-span-2 text-left">
                    <div className="inline-flex items-center gap-1 text-orange-400">
                      <Flame className="w-4 h-4" />
                      <span className="font-semibold">{player.streak}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-left">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                      <span className="text-xs text-green-400">Online</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Bottom */}
              <div className="px-6 py-4 text-center border-t border-white/5">
                <button className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors flex items-center gap-2 mx-auto">
                  View Full Leaderboard
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
