import { LogIn, LogOut, User, Plus, Home, Shield, History, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import copaLogo from "@/assets/copa-unique-logo.png";

const Header = () => {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img 
              src={copaLogo} 
              alt="Copa Unique League 2026" 
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-1">
                  <Link to="/">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${
                        location.pathname === "/"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${
                        location.pathname === "/register"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Registrar
                    </Button>
                  </Link>
                  <Link to="/history">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${
                        location.pathname === "/history"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <History className="w-4 h-4" />
                      Histórico
                    </Button>
                  </Link>
                  <Link to="/analytics">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${
                        location.pathname === "/analytics"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Análises
                    </Button>
                  </Link>
                  {role === "admin" && (
                    <Link to="/admin">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${
                          location.pathname === "/admin"
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                </nav>

                {/* Mobile Register Button */}
                <Link to="/register" className="md:hidden">
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[150px] truncate">
                      {profile?.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-primary mt-1 capitalize">
                      {role === "admin" ? "Coordenador" : "Membro"}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  
                  {/* Mobile Navigation */}
                  <div className="md:hidden">
                    <DropdownMenuItem
                      onClick={() => navigate("/")}
                      className="text-foreground cursor-pointer"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/register")}
                      className="text-foreground cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Dados
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/history")}
                      className="text-foreground cursor-pointer"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/analytics")}
                      className="text-foreground cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Análises
                    </DropdownMenuItem>
                    {role === "admin" && (
                      <DropdownMenuItem
                        onClick={() => navigate("/admin")}
                        className="text-foreground cursor-pointer"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                  </div>
                  
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
