import { Trophy, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-gold-shine shadow-gold">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gradient-gold tracking-tight">
                Copa Unique League
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                2026 Edition
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
