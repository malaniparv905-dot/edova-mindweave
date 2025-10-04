import { Home, Settings, Calendar, TrendingUp } from "lucide-react";

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Navigation = ({ activeView, onViewChange }: NavigationProps) => {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "setup", label: "Setup", icon: Settings },
    { id: "planner", label: "Planner", icon: Calendar },
    { id: "progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-2 px-4 py-3 transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
