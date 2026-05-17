import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Features", href: "#features" },
  { name: "How to Play", href: "#how-to-play" },
  { name: "Leaderboard", href: "#leaderboard" },
  { name: "Start", href: "#download" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.slice(1));

    const observers = sectionIds.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        {
          rootMargin: "-10% 0px -50% 0px",
          threshold: 0,
        },
      );

      observer.observe(el);
      return observer;
    });

    return () => {
      observers.forEach((obs, i) => {
        const el = document.getElementById(sectionIds[i]);
        if (obs && el) obs.unobserve(el);
      });
    };
  }, []);

  return (
    <>
      <motion.nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-black/80 backdrop-blur-xl border-b border-white/5"
            : "bg-transparent",
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="#home" className="flex items-center gap-3 group">
              <div className="relative">
                <Crown className="w-8 h-8 text-orange-500 transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
              </div>
              <span className="font-orbitron text-xl font-bold text-white tracking-wider">
                TEMPO
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const id = link.href.slice(1);
                const isActive = activeSection === id;
                const isHovered = hoveredLink === id;

                return (
                  <a
                    key={link.name}
                    href={link.href}
                    onMouseEnter={() => setHoveredLink(id)}
                    onMouseLeave={() => setHoveredLink(null)}
                    className={cn(
                      "relative px-4 py-2 text-sm transition-colors duration-300",
                      isActive
                        ? "text-white"
                        : "text-white/60 hover:text-white",
                    )}
                  >
                    {link.name}
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-orange-500 transition-all duration-300"
                      style={{ width: isActive || isHovered ? "50%" : "0%" }}
                    />
                  </a>
                );
              })}
              <Link
                to="/menu"
                className="ml-4 px-6 py-2.5 bg-orange-500 text-black text-sm font-semibold rounded-full hover:bg-orange-400 transition-all duration-300 glow-orange"
              >
                Play Now
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {navLinks.map((link, index) => {
                const isActive = activeSection === link.href.slice(1);

                return (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    className={cn(
                      "text-2xl font-orbitron transition-colors",
                      isActive
                        ? "text-orange-500"
                        : "text-white/80 hover:text-orange-500",
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </motion.a>
                );
              })}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  to="/menu"
                  className="mt-4 inline-block px-8 py-3 bg-orange-500 text-black font-semibold rounded-full"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Play Now
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
