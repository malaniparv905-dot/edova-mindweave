import { ArrowRight } from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

export const SplashScreen = ({ onEnter }: SplashScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-cyber opacity-20" />
      
      <div className="relative z-10 text-center space-y-8 animate-fade-in">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent animate-pulse">
          EDOVA
        </h1>
        <p className="text-xl text-muted-foreground">Adaptive Study Planner</p>
        
        <button
          onClick={onEnter}
          className="mt-8 group relative inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:shadow-glow transition-all duration-300 hover:scale-105"
        >
          <span className="text-lg font-semibold">Enter App</span>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
