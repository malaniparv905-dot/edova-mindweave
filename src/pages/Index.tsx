import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthPage } from "@/components/AuthPage";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { HomeView } from "@/components/HomeView";
import { SetupView } from "@/components/SetupView";
import { PlannerView } from "@/components/PlannerView";
import { ProgressView } from "@/components/ProgressView";
import { Session, User } from "@supabase/supabase-js";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeView, setActiveView] = useState("home");
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadUserData(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      setXp(profile.xp || 0);
      setActiveView(profile.last_visited_screen || 'home');
    }
  };

  const updateLastVisitedScreen = async (view: string) => {
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ last_visited_screen: view })
        .eq('user_id', user.id);
    }
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    updateLastVisitedScreen(view);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setShowSplash(true);
  };

  const handleAuthSuccess = () => {
    // Auth state change will be handled by onAuthStateChange
  };

  if (showSplash) {
    return <SplashScreen onEnter={() => setShowSplash(false)} />;
  }

  if (!user || !session) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header xp={xp} onLogout={handleLogout} />
      <Navigation activeView={activeView} onViewChange={handleViewChange} />
      
      <main className="container mx-auto px-4 py-8">
        {activeView === "home" && <HomeView />}
        {activeView === "setup" && <SetupView />}
        {activeView === "planner" && <PlannerView />}
        {activeView === "progress" && <ProgressView />}
      </main>
    </div>
  );
};

export default Index;
