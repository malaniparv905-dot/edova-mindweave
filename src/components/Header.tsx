import { Zap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  xp: number;
  onLogout: () => void;
}

export const Header = ({ xp, onLogout }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            EDOVA
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-amber-500">{xp} XP</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
