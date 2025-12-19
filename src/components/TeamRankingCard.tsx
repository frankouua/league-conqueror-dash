import { Trophy, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface TeamRankingCardProps {
  position: 1 | 2;
  teamName: string;
  totalPoints: number;
  revenuePoints: number;
  qualityPoints: number;
  modifierPoints: number;
  totalRevenue: number;
  pointsDifference?: number;
  isLeading: boolean;
}

const TeamRankingCard = ({
  position,
  teamName,
  totalPoints,
  revenuePoints,
  qualityPoints,
  modifierPoints,
  totalRevenue,
  pointsDifference = 0,
  isLeading,
}: TeamRankingCardProps) => {
  // Determine which logo to use based on team name
  const teamLogo = teamName.toLowerCase().includes("lioness") 
    ? brasaoLioness 
    : teamName.toLowerCase().includes("tr") 
    ? brasaoTroia 
    : position === 1 ? brasaoLioness : brasaoTroia;

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-500 ${
        isLeading
          ? "card-winner shadow-gold-intense"
          : "bg-gradient-card border border-border"
      }`}
    >
      {/* Position Badge */}
      <div
        className={`absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
          isLeading
            ? "bg-gradient-gold-shine text-primary-foreground shadow-gold"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {position}º
      </div>

      {/* Trophy for leader */}
      {isLeading && (
        <div className="absolute -top-6 right-6 trophy-glow">
          <Trophy className="w-12 h-12 text-primary animate-float" />
        </div>
      )}

      {/* Team Logo and Name */}
      <div className="mt-4 mb-6 flex items-center gap-4">
        <img 
          src={teamLogo} 
          alt={`Brasão ${teamName}`}
          className="w-16 h-16 object-contain drop-shadow-lg"
          style={{ filter: "drop-shadow(0 0 10px hsl(43 65% 52% / 0.3))" }}
        />
        <div>
          <h3
            className={`text-2xl font-bold ${
              isLeading ? "text-gradient-gold" : "text-foreground"
            }`}
          >
            {teamName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {pointsDifference > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success text-sm font-medium">
                  +{pointsDifference} pts à frente
                </span>
              </>
            ) : pointsDifference < 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-destructive text-sm font-medium">
                  {pointsDifference} pts atrás
                </span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm font-medium">
                  Empate
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Total Points */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm uppercase tracking-wider mb-1">
          Pontuação Total
        </p>
        <p
          className={`text-5xl font-black ${
            isLeading ? "text-gradient-gold" : "text-foreground"
          }`}
        >
          {totalPoints.toLocaleString("pt-BR")}
        </p>
        <p className="text-muted-foreground text-sm">pontos</p>
      </div>

      {/* Revenue in R$ */}
      <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="text-success text-sm font-medium">Faturamento Acumulado</span>
        </div>
        <p className="text-2xl font-bold text-success">
          R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Points Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Faturamento (pts)</span>
          <span className="text-foreground font-semibold">
            {revenuePoints.toLocaleString("pt-BR")} pts
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Qualidade</span>
          <span className="text-foreground font-semibold">
            {qualityPoints.toLocaleString("pt-BR")} pts
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Modificadores</span>
          <span
            className={`font-semibold ${
              modifierPoints > 0
                ? "text-success"
                : modifierPoints < 0
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {modifierPoints > 0 ? "+" : ""}
            {modifierPoints} pts
          </span>
        </div>
      </div>
    </div>
  );
};

export default TeamRankingCard;
