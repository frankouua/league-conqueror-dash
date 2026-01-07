import { memo } from "react";
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
      className={`relative rounded-2xl p-4 sm:p-6 transition-all duration-500 overflow-hidden ${
        isLeading
          ? "card-winner shadow-gold-intense"
          : "bg-gradient-card border border-border"
      }`}
    >
      {/* Position Badge */}
      <div
        className={`absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-lg sm:text-xl z-10 ${
          isLeading
            ? "bg-gradient-gold-shine text-primary-foreground shadow-gold"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {position}º
      </div>

      {/* Trophy for leader - positioned inside container */}
      {isLeading && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 trophy-glow z-10">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary animate-float" />
        </div>
      )}

      {/* Team Logo and Name */}
      <div className="mt-6 sm:mt-4 mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
        <img 
          src={teamLogo} 
          alt={`Brasão ${teamName}`}
          className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg flex-shrink-0"
          style={{ filter: "drop-shadow(0 0 10px hsl(43 65% 52% / 0.3))" }}
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-lg sm:text-xl md:text-2xl font-bold truncate ${
              isLeading ? "text-gradient-gold" : "text-foreground"
            }`}
          >
            {teamName}
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
            {pointsDifference > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                <span className="text-success text-xs sm:text-sm font-medium truncate">
                  +{pointsDifference} pts à frente
                </span>
              </>
            ) : pointsDifference < 0 ? (
              <>
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-destructive flex-shrink-0" />
                <span className="text-destructive text-xs sm:text-sm font-medium truncate">
                  {pointsDifference} pts atrás
                </span>
              </>
            ) : (
              <>
                <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs sm:text-sm font-medium">
                  Empate
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Total Points */}
      <div className="mb-4 sm:mb-6">
        <p className="text-muted-foreground text-xs sm:text-sm uppercase tracking-wider mb-1">
          Pontuação Total
        </p>
        <p
          className={`text-3xl sm:text-4xl md:text-5xl font-black ${
            isLeading ? "text-gradient-gold" : "text-foreground"
          }`}
        >
          {totalPoints.toLocaleString("pt-BR")}
        </p>
        <p className="text-muted-foreground text-xs sm:text-sm">pontos</p>
      </div>

      {/* Revenue in R$ */}
      <div className="mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg bg-success/10 border border-success/20">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
          <span className="text-success text-xs sm:text-sm font-medium truncate">Faturamento Acumulado</span>
        </div>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-success">
          R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Points Breakdown */}
      <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs sm:text-sm">Faturamento (pts)</span>
          <span className="text-foreground font-semibold text-sm sm:text-base">
            {revenuePoints.toLocaleString("pt-BR")} pts
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs sm:text-sm">Qualidade</span>
          <span className="text-foreground font-semibold text-sm sm:text-base">
            {qualityPoints.toLocaleString("pt-BR")} pts
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs sm:text-sm">Modificadores</span>
          <span
            className={`font-semibold text-sm sm:text-base ${
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

export default memo(TeamRankingCard);
