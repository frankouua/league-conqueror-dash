import { Gift } from "lucide-react";

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
  const goal1Reached = currentRevenue >= goal1;
  const goal2Reached = currentRevenue >= goal2;
  const goal3Reached = currentRevenue >= goal3;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Metas Coletivas da Clínica</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Meta 1 */}
        <div
          className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
            goal1Reached
              ? "bg-success border-2 border-success"
              : "bg-success/80 border-2 border-success/60"
          }`}
        >
          <p className="text-xl md:text-2xl font-bold text-white">
            {formatCurrency(goal1)}
          </p>
          <span className="mt-2 px-3 py-1 bg-primary/80 text-xs font-semibold rounded-full text-primary-foreground">
            +50 pts
          </span>
        </div>

        {/* Meta 2 */}
        <div
          className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
            goal2Reached
              ? "bg-success border-2 border-success"
              : "bg-success/80 border-2 border-success/60"
          }`}
        >
          <p className="text-xl md:text-2xl font-bold text-white">
            {formatCurrency(goal2)}
          </p>
          <span className="mt-2 px-3 py-1 bg-primary/80 text-xs font-semibold rounded-full text-primary-foreground">
            +50 pts
          </span>
        </div>

        {/* Meta 3 */}
        <div
          className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
            goal3Reached
              ? "bg-gradient-gold-shine border-2 border-primary shadow-gold"
              : "bg-secondary border-2 border-border"
          }`}
        >
          <p className={`text-xl md:text-2xl font-bold ${goal3Reached ? "text-primary-foreground" : "text-foreground"}`}>
            {formatCurrency(goal3)}
          </p>
          <span className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
            goal3Reached 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            +100 pts
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClinicGoalsCard;
