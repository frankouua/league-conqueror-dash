import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Users, Shield, Briefcase, BadgeCheck } from "lucide-react";
import logoUnique from "@/assets/logo-unique.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  teamId: z.string().optional(),
  isAdmin: z.boolean(),
  department: z.string().optional(),
  position: z.string().optional(),
}).refine((data) => data.isAdmin || (data.teamId && data.teamId.length > 0), {
  message: "Selecione uma equipe ou marque como Administrador",
  path: ["teamId"],
}).refine((data) => data.isAdmin || (data.department && data.department.length > 0), {
  message: "Selecione um departamento",
  path: ["department"],
}).refine((data) => data.isAdmin || (data.position && data.position.length > 0), {
  message: "Selecione um cargo",
  path: ["position"],
});

const DEPARTMENTS = [
  { value: "comercial", label: "Comercial" },
  { value: "atendimento", label: "Atendimento" },
  { value: "marketing", label: "Marketing" },
  { value: "administrativo", label: "Administrativo" },
  { value: "clinico", label: "Clínico" },
];

const POSITIONS = [
  { value: "comercial_1_captacao", label: "Comercial 1 - Social Selling" },
  { value: "comercial_2_closer", label: "Comercial 2 - Closer" },
  { value: "comercial_3_experiencia", label: "Comercial 3 - Customer Success" },
  { value: "comercial_4_farmer", label: "Comercial 4 - Farmer" },
  { value: "sdr", label: "SDR" },
  { value: "coordenador", label: "Coordenador(a)" },
  { value: "gerente", label: "Gerente" },
  { value: "assistente", label: "Assistente" },
  { value: "outro", label: "Outro" },
];

interface Team {
  id: string;
  name: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    teamId: "",
    isAdmin: false,
    department: "",
    position: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Prevent UI deadlocks: auth/network calls can hang when backend is unstable.
  // We race them with a timeout so the button never stays in “Entrando...” forever.
  const withTimeout = async <T,>(
    promiseLike: unknown,
    fallback: T,
    timeoutMs = 12000
  ): Promise<T> =>
    (await Promise.race([
      Promise.resolve(promiseLike as any) as Promise<T>,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs)),
    ])) as T;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch teams for signup
  useEffect(() => {
    const fetchTeams = async () => {
      const result = await withTimeout<{ data: Team[] | null; error: any }>(
        supabase.from("teams").select("id, name"),
        { data: [], error: { message: "timeout" } },
        8000
      );

      if (result?.data?.length) setTeams(result.data);
    };
    fetchTeams();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Erro",
        description: "Digite seu email para recuperar a senha",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await withTimeout<{ error: any }>(
        supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
        { error: { message: "timeout" } },
        12000
      );

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("timeout") || msg.includes("fetch") || msg.includes("network")) {
          toast({
            title: "Erro de conexão",
            description: "Servidor instável. Tente novamente em alguns segundos.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha",
        });
        setIsForgotPassword(false);
        setResetEmail("");
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Helper to retry login on transient errors.
    // Also clears any possibly-corrupted local session that can break token refresh.
    const attemptSignIn = async (retries = 2): Promise<{ error: Error | null }> => {
      // If the browser has a broken refresh token stored, Supabase can fail with 500 on /token.
      // Clearing local session before a password login makes the flow recover.
      if (retries === 2) {
        try {
          // scope: 'local' avoids a network call and just clears local persisted session.
          await (supabase.auth as any).signOut({ scope: 'local' });
        } catch {
          // ignore
        }
      }

      const result = await withTimeout<{ error: Error | null }>(
        signIn(formData.email, formData.password),
        { error: new Error("timeout") },
        12000
      );

      if (result.error) {
        // Minimal log for diagnostics (no credentials)
        console.warn('[auth] signIn failed:', result.error.message);

        const msg = result.error.message?.toLowerCase() || '';
        const isTransient =
          msg.includes('context canceled') ||
          msg.includes('network') ||
          msg.includes('timeout') ||
          msg.includes('fetch') ||
          msg.includes('refresh token') ||
          msg.includes('status 500') ||
          msg.includes('500');

        if (isTransient && retries > 0) {
          await new Promise((r) => setTimeout(r, 1200));
          return attemptSignIn(retries - 1);
        }
      }

      return result;
    };

    try {
      if (isLogin) {
        // Validate login
        const result = loginSchema.safeParse({
          email: formData.email,
          password: formData.password,
        });

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await attemptSignIn();

        if (error) {
          const msg = error.message?.toLowerCase() || '';
          if (msg.includes("invalid login credentials")) {
            toast({
              title: "Erro ao entrar",
              description: "Email ou senha incorretos",
              variant: "destructive",
            });
          } else if (msg.includes("context canceled") || msg.includes("network") || msg.includes("timeout") || msg.includes("fetch")) {
            toast({
              title: "Erro de conexão",
              description: "Servidor instável. Tente novamente em alguns segundos.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso",
          });
          navigate("/");
        }
      } else {
        // Validate signup
        const result = signUpSchema.safeParse(formData);

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await withTimeout<{ error: Error | null }>(
          signUp(
            formData.email,
            formData.password,
            formData.fullName,
            formData.isAdmin ? "" : formData.teamId,
            formData.isAdmin ? "admin" : "member",
            formData.isAdmin ? null : (formData.department as any),
            formData.isAdmin ? null : (formData.position as any)
          ),
          { error: new Error("timeout") },
          15000
        );

        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("timeout") || msg.includes("fetch") || msg.includes("network")) {
            toast({
              title: "Erro de conexão",
              description: "Servidor instável. Tente novamente em alguns segundos.",
              variant: "destructive",
            });
            return;
          }
          if (error.message.includes("already registered")) {
            toast({
              title: "Erro ao cadastrar",
              description: "Este email já está cadastrado",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao cadastrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Você foi cadastrado com sucesso",
          });
          // Redirecionar para onboarding de metas se tiver equipe
          if (!formData.isAdmin && formData.teamId) {
            navigate("/onboarding-goals");
          } else {
            navigate("/");
          }
        }
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logoUnique} alt="Unique Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-gradient-gold">
            Copa Unique League
          </h1>
          <p className="text-muted-foreground mt-2">2026 Edition</p>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-8 shadow-card animate-scale-in">
          {isForgotPassword ? (
            /* Forgot Password Form */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2">Recuperar Senha</h2>
                <p className="text-muted-foreground text-sm">
                  Digite seu email para receber o link de recuperação
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90 shadow-gold transition-all duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmail("");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar ao login
                </button>
              </form>
            </div>
          ) : (
            /* Login/Signup Form */
            <>
              <div className="flex gap-2 mb-8">
                <Button
                  variant={isLogin ? "default" : "outline"}
                  className={`flex-1 ${
                    isLogin
                      ? "bg-gradient-gold text-primary-foreground hover:opacity-90"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsLogin(true)}
                >
                  Entrar
                </Button>
                <Button
                  variant={!isLogin ? "default" : "outline"}
                  className={`flex-1 ${
                    !isLogin
                      ? "bg-gradient-gold text-primary-foreground hover:opacity-90"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsLogin(false)}
                >
                  Cadastrar
                </Button>
              </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="pl-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-destructive text-sm">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="pl-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                />
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password}</p>
              )}
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-4">
                {/* Admin Checkbox */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Checkbox
                    id="isAdmin"
                    checked={formData.isAdmin}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({ 
                        ...prev, 
                        isAdmin: checked === true,
                        teamId: checked === true ? "" : prev.teamId 
                      }));
                      setErrors((prev) => ({ ...prev, teamId: "" }));
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <Label htmlFor="isAdmin" className="text-foreground cursor-pointer">
                      Sou Administrador/Coordenador (sem equipe)
                    </Label>
                  </div>
                </div>

                {/* Team Select - only show if not admin */}
                {!formData.isAdmin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="team" className="text-foreground">
                        Equipe
                      </Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Select
                          value={formData.teamId}
                          onValueChange={(value) => handleInputChange("teamId", value)}
                        >
                          <SelectTrigger className="pl-11 bg-secondary border-border text-foreground">
                            <SelectValue placeholder="Selecione sua equipe" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {teams.map((team) => (
                              <SelectItem
                                key={team.id}
                                value={team.id}
                                className="text-foreground hover:bg-secondary focus:bg-secondary"
                              >
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.teamId && (
                        <p className="text-destructive text-sm">{errors.teamId}</p>
                      )}
                    </div>

                    {/* Department Select */}
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-foreground">
                        Departamento
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Select
                          value={formData.department}
                          onValueChange={(value) => handleInputChange("department", value)}
                        >
                          <SelectTrigger className="pl-11 bg-secondary border-border text-foreground">
                            <SelectValue placeholder="Selecione seu departamento" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem
                                key={dept.value}
                                value={dept.value}
                                className="text-foreground hover:bg-secondary focus:bg-secondary"
                              >
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.department && (
                        <p className="text-destructive text-sm">{errors.department}</p>
                      )}
                    </div>

                    {/* Position Select */}
                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-foreground">
                        Cargo
                      </Label>
                      <div className="relative">
                        <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Select
                          value={formData.position}
                          onValueChange={(value) => handleInputChange("position", value)}
                        >
                          <SelectTrigger className="pl-11 bg-secondary border-border text-foreground">
                            <SelectValue placeholder="Selecione seu cargo" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {POSITIONS.map((pos) => (
                              <SelectItem
                                key={pos.value}
                                value={pos.value}
                                className="text-foreground hover:bg-secondary focus:bg-secondary"
                              >
                                {pos.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.position && (
                        <p className="text-destructive text-sm">{errors.position}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-gold-shine text-primary-foreground font-bold hover:opacity-90 shadow-gold transition-all duration-300"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Entrando..." : "Cadastrando..."}
                </span>
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          © 2026 Unique CPI • Copa Unique League
        </p>
      </div>
    </div>
  );
};

export default Auth;
