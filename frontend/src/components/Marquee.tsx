import { motion } from "framer-motion"

const words = [
  "CHECKERS",
  "STRATEGY",
  "COMPETITIVE",
  "MULTIPLAYER",
  "RANKED",
  "TOURNAMENTS",
  "KING ME",
  "CAPTURE",
]

export function Marquee() {
  return (
    <div className="relative py-8 overflow-hidden border-y border-white/5 bg-[#0a0a0a]">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...words, ...words, ...words, ...words].map((word, index) => (
          <span
            key={index}
            className="mx-8 font-orbitron text-4xl sm:text-5xl font-black text-transparent"
            style={{
              WebkitTextStroke: "1px rgba(249, 115, 22, 0.3)",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}
