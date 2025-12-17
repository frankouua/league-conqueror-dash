import { Target, Sparkles, Crown, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ClinicGoalsCardProps {
  currentRevenue: number;
  goal1: number;
  goal2: number;
  goal3: number;
}

const ClinicGoalsCard = ({
  currentRevenue,
  goal1,
  goal2,
  goal3,
}: ClinicGoalsCardProps) => {
  const progressToGoal3 = Math.min((currentRevenue / goal3) * 100, 100);
  const goal1Reached = currentRevenue >= goal1;
  const goal2Reached = currentRevenue >= goal2;
  const goal3Reached = currentRevenue >= goal3;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Metas da Clínica</h3>
          <p className="text-muted-foreground text-sm">
            Faturamento combinado das equipes
          </p>
        </div>
      </div>

      {/* Current Revenue */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm uppercase tracking-wider mb-1">
          Faturamento Atual
        </p>
        <p className="text-4xl font-black text-gradient-gold">
          {formatCurrency(currentRevenue)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute h-full progress-bar-gold transition-all duration-1000 rounded-full"
            style={{ width: `${progressToGoal3}%` }}
          />
          {/* Goal Markers */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
            style={{ left: `${(goal1 / goal3) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
            style={{ left: `${(goal2 / goal3) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>R$ 0</span>
          <span>{formatCurrency(goal3)}</span>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {/* Goal 1 */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl transition-all ${
            goal1Reached
              ? "bg-success/10 border border-success/30"
              : "bg-secondary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles
              className={`w-5 h-5 ${
                goal1Reached ? "text-success" : "text-muted-foreground"
              }`}
            />
            <div>
              <p
                className={`font-semibold ${
                  goal1Reached ? "text-success" : "text-foreground"
                }`}
              >
                Meta 1: {formatCurrency(goal1)}
              </p>
              <p className="text-muted-foreground text-sm">Meta base</p>
            </div>
          </div>
          {goal1Reached && (
            <span className="px-3 py-1 bg-success text-success-foreground text-xs font-bold rounded-full">
              ✓ Atingida
            </span>
          )}
        </div>

        {/* Goal 2 */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl transition-all ${
            goal2Reached
              ? "bg-primary/10 border border-primary/30"
              : "bg-secondary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Crown
              className={`w-5 h-5 ${
                goal2Reached ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div>
              <p
                className={`font-semibold ${
                  goal2Reached ? "text-primary" : "text-foreground"
                }`}
              >
                Meta 2: {formatCurrency(goal2)}
              </p>
              <p className="text-muted-foreground text-sm">
                +50 pts para ambas as equipes
              </p>
            </div>
          </div>
          {goal2Reached ? (
            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              ✓ +50 pts
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              Faltam {formatCurrency(goal2 - currentRevenue)}
            </span>
          )}
        </div>

        {/* Goal 3 */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl transition-all ${
            goal3Reached
              ? "bg-primary/20 border-2 border-primary shadow-gold animate-pulse-gold"
              : "bg-secondary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Gem
              className={`w-5 h-5 ${
                goal3Reached ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div>
              <p
                className={`font-semibold ${
                  goal3Reached ? "text-gradient-gold" : "text-foreground"
                }`}
              >
                Meta 3: {formatCurrency(goal3)}
              </p>
              <p className="text-muted-foreground text-sm">
                +100 pts para ambas as equipes
              </p>
            </div>
          </div>
          {goal3Reached ? (
            <span className="px-3 py-1 bg-gradient-gold-shine text-primary-foreground text-xs font-bold rounded-full shadow-gold">
              🏆 +100 pts
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              Faltam {formatCurrency(goal3 - currentRevenue)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicGoalsCard;
