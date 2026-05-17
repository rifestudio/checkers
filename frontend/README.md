# Checkers — The Classic Reimagined

A premium, dark futuristic checkers game landing page built with React, TypeScript, Vite, Three.js, and Framer Motion.

## Features

- **3D Animated Checker Piece** — Interactive 3D checker piece rendered with React Three Fiber, featuring floating animation, glow effects, and orbiting pieces
- **Dark Futuristic Minimalism** — Premium black and orange color palette with cinematic UI design
- **Scroll Animations** — Smooth scroll-triggered animations using Framer Motion with intersection observer
- **Responsive Design** — Fully responsive layout that works on all screen sizes
- **Interactive Components** — Hover effects, animated counters, glow cards, and more
- **Performance Optimized** — Built with Vite for fast development and optimized production builds

## Tech Stack

- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Tailwind CSS** — Utility-first CSS
- **Framer Motion** — Animation library
- **React Three Fiber** — React renderer for Three.js
- **Drei** — Useful helpers for React Three Fiber
- **Lucide React** — Icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone or extract the project
cd checkers-landing

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server will start at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

## Project Structure

```
checkers-landing/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── 3d/             # 3D components (Three.js)
│   │   │   ├── CheckerPiece3D.tsx
│   │   │   └── HeroScene.tsx
│   │   ├── ui/             # Reusable UI components
│   │   │   ├── AnimatedCounter.tsx
│   │   │   ├── AnimatedText.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── GlowCard.tsx
│   │   │   └── ScrollReveal.tsx
│   │   ├── Navigation.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HowToPlaySection.tsx
│   │   ├── LeaderboardSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── DownloadSection.tsx
│   │   ├── Marquee.tsx
│   │   └── Footer.tsx
│   ├── hooks/
│   │   ├── useScrollAnimation.ts
│   │   └── useMousePosition.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── .eslintrc.cjs
```

## Sections

1. **Hero** — Full-screen hero with 3D animated checker piece, animated text, and stats
2. **Marquee** — Infinite scrolling text with stroke effect
3. **Features** — 6 feature cards with hover glow effects
4. **How to Play** — Step-by-step guide with animated progress line
5. **Leaderboard** — Top players table with animated counters and stats
6. **Testimonials** — Player reviews with star ratings
7. **Download** — Platform download cards with 3D board preview
8. **Footer** — Links, social icons, and copyright

## Customization

### Colors

The primary color scheme is defined in `tailwind.config.js` and `src/styles/globals.css`:

- **Black**: `#080808` (background), `#0a0a0a` (cards)
- **Orange**: `#f97316` (primary), `#fb923c` (secondary)
- **White**: `#ffffff` (text), with various opacity levels

### Animations

Animation timings and easing can be adjusted in the Framer Motion components:
- `duration` — Animation duration in seconds
- `delay` — Delay before animation starts
- `ease` — Easing function (default: `[0.22, 1, 0.36, 1]`)

## License

MIT
