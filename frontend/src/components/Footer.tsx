import { Crown, Github, Twitter, Youtube, MessageCircle } from "lucide-react";

const footerLinks = {
  Game: ["Play Now", "Tournaments", "Leaderboard", "Rules", "Updates"],
  Community: ["Discord", "Forums", "Blog", "Events", "Partners"],
  Support: ["Help Center", "Contact Us", "Bug Report", "Feedback", "Status"],
  Legal: ["Terms of Service", "Privacy Policy", "Cookie Policy", "Licenses"],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: MessageCircle, href: "#", label: "Discord" },
];

export function Footer() {
  return (
    <footer className="relative bg-[#050505] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#home" className="flex items-center gap-3 mb-6">
              <Crown className="w-8 h-8 text-orange-500" />
              <span className="font-orbitron text-xl font-bold text-white tracking-wider">
                CHECKERS
              </span>
            </a>
            <p className="text-sm text-white/30 mb-6 leading-relaxed">
              The classic strategy game, reimagined for the modern era.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-orbitron text-sm font-semibold text-white mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/30 hover:text-orange-500 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/20">&copy; 2026 TEMPO</p>
        </div>
      </div>
    </footer>
  );
}
