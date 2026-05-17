import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { HeroSection } from "./components/HeroSection";
import { Marquee } from "./components/Marquee";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowToPlaySection } from "./components/HowToPlaySection";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { DownloadSection } from "./components/DownloadSection";
import { Footer } from "./components/Footer";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { GameMenuPage } from "./pages/game/GameMenuPage";
import { CheckersBoard } from "./components/game/CheckersBoard";
import { supabase } from "./lib/supabase";
import { useEffect } from "react";
import { useAuthStore } from "./lib/authStore";
import { PricingPage } from "./pages/PricingPage";

function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <Marquee />
      <FeaturesSection />
      <HowToPlaySection />
      <LeaderboardSection />
      <TestimonialsSection />
      <DownloadSection />
      <Footer />
    </div>
  );
}

function App() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAuthStore.getState().setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      useAuthStore.getState().setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={user ? <Navigate to="/menu" /> : <LoginPage />}
        />

        <Route
          path="/register"
          element={user ? <Navigate to="/menu" /> : <RegisterPage />}
        />

        <Route
          path="/menu"
          element={user ? <GameMenuPage /> : <Navigate to="/login" />}
        />

        {/* AI-mode route — 3 segments, must be matched before /game/:inviteCode */}
        <Route
          path="/game/ai/:difficulty"
          element={user ? <CheckersBoard /> : <Navigate to="/login" />}
        />

        {/* Multiplayer game by invite code */}
        <Route
          path="/game/:inviteCode"
          element={user ? <CheckersBoard /> : <Navigate to="/login" />}
        />
        <Route
          path="/pricing"
          element={user ? <PricingPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
