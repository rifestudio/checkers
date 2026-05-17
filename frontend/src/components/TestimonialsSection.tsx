import { motion } from "framer-motion"
import { ScrollReveal } from "./ui/ScrollReveal"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Grandmaster",
    rating: 5,
    text: "The most polished checkers experience I've ever played. The matchmaking is incredibly fast and the UI is absolutely stunning.",
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "Pro Player",
    rating: 5,
    text: "I've been playing checkers for 20 years and this app has completely redefined what I expect from a digital board game.",
    avatar: "MJ",
  },
  {
    name: "Elena Rodriguez",
    role: "Casual Player",
    rating: 5,
    text: "Beautiful design, smooth gameplay, and the tutorial helped me learn the game in under 30 minutes. Highly recommended!",
    avatar: "ER",
  },
]

export function TestimonialsSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 checker-pattern opacity-30" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <ScrollReveal>
            <span className="inline-block text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
              Testimonials
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h2 className="font-orbitron text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              What Players <span className="gradient-text">Say</span>
            </h2>
          </ScrollReveal>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={testimonial.name} delay={index * 0.15}>
              <motion.div
                className="relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-orange-500/20 transition-all duration-500 group h-full"
                whileHover={{ y: -5 }}
              >
                {/* Quote icon */}
                <Quote className="w-10 h-10 text-orange-500/20 mb-6" />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-orange-500 fill-orange-500" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-white/60 leading-relaxed mb-8">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-sm font-bold text-white">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-orange-500">{testimonial.role}</div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
