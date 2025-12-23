import { 
  LogIn, LogOut, User, Plus, Home, Shield, History, BarChart3, 
  BookOpen, Users, Target, FileText, Menu, Trophy, Star, TrendingUp,
  ChevronDown, Settings, AlertCircle, Route, UserPlus, MessageSquareText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import copaLogo from "@/assets/logo-copa-unique-league.png";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { useGoalNotifications } from "@/hooks/useGoalNotifications";
import { useUserTeamStats } from "@/hooks/useUserTeamStats";
import { useState } from "react";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DEPARTMENT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  atendimento: "Atendimento",
  marketing: "Marketing",
  administrativo: "Administrativo",
  clinico: "Clínico",
};

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Comercial 1 - Social Selling",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Customer Success",
  comercial_4_farmer: "Comercial 4 - Farmer",
  sdr: "SDR",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

const Header = () => {
  const { user, profile, role, signOut } = useAuth();
  const { stats } = useUserTeamStats();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useGoalNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const currentMonth = MONTH_NAMES[new Date().getMonth()];

  const navLinks = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/register", label: "Registrar", icon: Plus },
    { path: "/referral-leads", label: "Indicações", icon: UserPlus },
    { path: "/patient-kanban", label: "Jornada", icon: Route },
    { path: "/data-reports", label: "Relatórios", icon: FileText },
    { path: "/performance", label: "Desempenho", icon: Target },
    { path: "/guides", label: "Guias", icon: BookOpen },
    { path: "/guias-comerciais", label: "Scripts", icon: MessageSquareText },
  ];

  const NavItem = ({ path, label, icon: Icon, onClick }: { path: string; label: string; icon: any; onClick?: () => void }) => (
    <Link to={path} onClick={onClick}>
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start gap-2 ${
          location.pathname === path
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  );

  // Get user initials for avatar fallback
  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
            <img 
              src={copaLogo} 
              alt="Copa Unique League 2026" 
              className="h-10 md:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${
                      location.pathname === link.path
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    <span className="hidden xl:inline">{link.label}</span>
                  </Button>
                </Link>
              ))}
              {role === "admin" && (
                <Link to="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${
                      location.pathname === "/admin"
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden xl:inline">Admin</span>
                  </Button>
                </Link>
              )}
            </nav>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                {/* Team Stats Badge (Desktop) */}
                {stats && (
                  <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {stats.position}º
                      </span>
                    </div>
                    <div className="h-4 w-px bg-primary/30" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground leading-tight">
                        {currentMonth}
                      </span>
                      <span className="text-sm font-bold text-foreground leading-tight">
                        {stats.currentMonthPoints.toLocaleString("pt-BR")} pts
                      </span>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 bg-card border-border p-0">
                    <SheetHeader className="p-4 border-b border-border">
                      <SheetTitle className="text-left text-foreground">Menu</SheetTitle>
                    </SheetHeader>
                    
                    {/* Profile Card */}
                    <div className="p-4 border-b border-border bg-muted/30">
                      <ProfileEditDialog>
                        <div className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative">
                            <Avatar className="w-14 h-14 border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Settings className="w-3 h-3 text-primary-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {profile?.full_name}
                            </p>
                            {profile?.position && (
                              <p className="text-xs text-muted-foreground truncate">
                                {POSITION_LABELS[profile.position] || profile.position}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                {role === "admin" ? "Coordenador" : "Membro"}
                              </Badge>
                              {profile?.department && (
                                <Badge variant="secondary" className="text-xs">
                                  {DEPARTMENT_LABELS[profile.department] || profile.department}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </ProfileEditDialog>

                      {/* Team Stats */}
                      {stats && (
                        <div className="mt-4 p-3 rounded-lg bg-card border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-primary fill-primary" />
                            <span className="font-semibold text-foreground">{stats.teamName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Posição</p>
                                <p className="font-bold text-primary">{stats.position}º lugar</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">{currentMonth}</p>
                                <p className="font-bold text-foreground">
                                  {stats.currentMonthPoints.toLocaleString("pt-BR")} pts
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Total Geral</span>
                              <span className="font-bold text-primary">
                                {stats.totalPoints.toLocaleString("pt-BR")} pts
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="p-4 space-y-1">
                      {navLinks.map((link) => (
                        <NavItem 
                          key={link.path} 
                          {...link} 
                          onClick={() => setMobileMenuOpen(false)} 
                        />
                      ))}
                      {role === "admin" && (
                        <NavItem 
                          path="/admin" 
                          label="Painel Admin" 
                          icon={Shield} 
                          onClick={() => setMobileMenuOpen(false)} 
                        />
                      )}
                    </div>

                    {/* Logout */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}

            {/* User Menu (Desktop) */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden md:flex gap-2 border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary pr-3"
                  >
                    <Avatar className="w-8 h-8 border border-primary/30">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start max-w-[100px]">
                      <span className="text-sm font-medium truncate w-full text-left">
                        {profile?.full_name?.split(' ')[0] || 'Usuário'}
                      </span>
                      {stats && (
                        <span className="text-[10px] text-muted-foreground truncate w-full text-left">
                          {stats.teamName}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-card border-border">
                  {/* Profile Section */}
                  <ProfileEditDialog>
                    <div className="p-3 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-primary/30">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Settings className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {profile?.full_name}
                          </p>
                          {profile?.position && (
                            <p className="text-xs text-muted-foreground truncate">
                              {POSITION_LABELS[profile.position] || profile.position}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              {role === "admin" ? "Coordenador" : "Membro"}
                            </Badge>
                            {profile?.department && (
                              <Badge variant="secondary" className="text-xs">
                                {DEPARTMENT_LABELS[profile.department] || profile.department}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">Editar perfil →</span>
                        </div>
                      </div>
                    </div>
                  </ProfileEditDialog>

                  {/* Team Stats */}
                  {stats && (
                    <>
                      <DropdownMenuSeparator className="bg-border" />
                      <div className="p-3">
                        <DropdownMenuLabel className="p-0 mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-semibold">{stats.teamName}</span>
                        </DropdownMenuLabel>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold text-primary">{stats.position}º</p>
                            <p className="text-[10px] text-muted-foreground">Posição</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold text-foreground">
                              {stats.currentMonthPoints.toLocaleString("pt-BR")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{currentMonth}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold text-foreground">
                              {stats.totalPoints.toLocaleString("pt-BR")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <DropdownMenuSeparator className="bg-border" />
                  
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer m-1"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair da Conta
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
