import { Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface TeamData {
  name: string;
  totalPoints: number;
  totalRevenue: number;
}

interface TeamBadgesDisplayProps {
  layout?: "horizontal" | "versus" | "tv";
  size?: "sm" | "md" | "lg" | "xl";
  winningTeam?: "lioness" | "troia" | "tie" | null;
  team1?: TeamData | null;
  team2?: TeamData | null;
}

const TeamBadgesDisplay = ({ 
  layout = "versus", 
  size = "lg", 
  winningTeam = null,
  team1 = null,
  team2 = null
}: TeamBadgesDisplayProps) => {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40 md:w-48 md:h-48",
    xl: "w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl md:text-2xl",
    xl: "text-2xl md:text-3xl lg:text-4xl",
  };

  const pointsSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl md:text-4xl",
    xl: "text-4xl md:text-5xl lg:text-6xl",
  };

  const isLionessWinning = winningTeam === "lioness";
  const isTroiaWinning = winningTeam === "troia";
  
  // Map team data to correct team based on name, not position
  const lionessData = team1?.name.toLowerCase().includes("lioness") ? team1 : 
                      team2?.name.toLowerCase().includes("lioness") ? team2 : null;
  const troiaData = team1?.name.toLowerCase().includes("tr") ? team1 : 
                    team2?.name.toLowerCase().includes("tr") ? team2 : null;
  
  const pointsDifference = team1 && team2 ? Math.abs(team1.totalPoints - team2.totalPoints) : 0;

  // TV-optimized layout for large screens
  if (layout === "tv") {
    return (
      <div className="flex items-center justify-center gap-6 md:gap-12 lg:gap-20 py-8">
        {/* Lioness Team */}
        <div className="flex flex-col items-center relative">
          {isLionessWinning && (
            <div className="absolute -top-8 md:-top-10 z-20">
              <Crown className="w-12 h-12 md:w-16 md:h-16 text-primary animate-float" />
            </div>
          )}
          <div className={`${sizeClasses[size]} relative group`}>
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all ${
              isLionessWinning ? "bg-primary/50" : "bg-primary/25"
            }`} />
            <img
              src={brasaoLioness}
              alt="Brasão Lioness Team"
              className={`w-full h-full object-contain relative z-10 drop-shadow-2xl ${
                isLionessWinning ? "winner-badge" : ""
              }`}
              style={{ filter: `drop-shadow(0 0 ${isLionessWinning ? "50px" : "35px"} hsl(43 65% 52% / ${isLionessWinning ? "0.8" : "0.5"}))` }}
            />
          </div>
          <h3 className={`${textSizes[size]} font-black text-gradient-gold mt-4`}>
            Lioness Team
          </h3>
          
          {/* Points Display */}
          {lionessData && (
            <div className="mt-3 text-center">
              <p className={`${pointsSizes[size]} font-black ${isLionessWinning ? "text-gradient-gold" : "text-foreground"}`}>
                {lionessData.totalPoints.toLocaleString("pt-BR")}
              </p>
              <p className="text-muted-foreground text-sm md:text-base font-medium">pontos</p>
              
              {/* Point Difference */}
              <div className="mt-2 flex items-center justify-center gap-1">
                {pointsDifference > 0 && isLionessWinning ? (
                  <>
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-success" />
                    <span className="text-success text-sm md:text-base font-semibold">
                      +{pointsDifference} pts
                    </span>
                  </>
                ) : pointsDifference > 0 && !isLionessWinning ? (
                  <>
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                    <span className="text-destructive text-sm md:text-base font-semibold">
                      -{pointsDifference} pts
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm md:text-base font-semibold">
                      Empate
                    </span>
                  </>
                )}
              </div>
              
              {/* Revenue */}
              <div className="mt-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
                <p className="text-success text-lg md:text-xl lg:text-2xl font-bold">
                  R$ {lionessData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
          
          {isLionessWinning && (
            <span className="text-sm md:text-base font-bold text-primary bg-primary/20 px-4 py-2 rounded-full mt-3 animate-pulse">
              🏆 Liderando
            </span>
          )}
        </div>

        {/* VS Separator */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-5xl md:text-7xl lg:text-8xl font-black text-primary animate-pulse">
            VS
          </span>
        </div>

        {/* Tróia Team */}
        <div className="flex flex-col items-center relative">
          {isTroiaWinning && (
            <div className="absolute -top-8 md:-top-10 z-20">
              <Crown className="w-12 h-12 md:w-16 md:h-16 text-primary animate-float" />
            </div>
          )}
          <div className={`${sizeClasses[size]} relative group`}>
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all ${
              isTroiaWinning ? "bg-primary/50" : "bg-info/25"
            }`} />
            <img
              src={brasaoTroia}
              alt="Brasão Tróia Team"
              className={`w-full h-full object-contain relative z-10 drop-shadow-2xl ${
                isTroiaWinning ? "winner-badge" : ""
              }`}
              style={{ filter: `drop-shadow(0 0 ${isTroiaWinning ? "50px" : "35px"} hsl(${isTroiaWinning ? "43 65% 52%" : "217 91% 60%"} / ${isTroiaWinning ? "0.8" : "0.5"}))` }}
            />
          </div>
          <h3 className={`${textSizes[size]} font-black text-gradient-gold mt-4`}>
            Tróia Team
          </h3>
          
          {/* Points Display */}
          {troiaData && (
            <div className="mt-3 text-center">
              <p className={`${pointsSizes[size]} font-black ${isTroiaWinning ? "text-gradient-gold" : "text-foreground"}`}>
                {troiaData.totalPoints.toLocaleString("pt-BR")}
              </p>
              <p className="text-muted-foreground text-sm md:text-base font-medium">pontos</p>
              
              {/* Point Difference */}
              <div className="mt-2 flex items-center justify-center gap-1">
                {pointsDifference > 0 && isTroiaWinning ? (
                  <>
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-success" />
                    <span className="text-success text-sm md:text-base font-semibold">
                      +{pointsDifference} pts
                    </span>
                  </>
                ) : pointsDifference > 0 && !isTroiaWinning ? (
                  <>
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                    <span className="text-destructive text-sm md:text-base font-semibold">
                      -{pointsDifference} pts
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm md:text-base font-semibold">
                      Empate
                    </span>
                  </>
                )}
              </div>
              
              {/* Revenue */}
              <div className="mt-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
                <p className="text-success text-lg md:text-xl lg:text-2xl font-bold">
                  R$ {troiaData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
          
          {isTroiaWinning && (
            <span className="text-sm md:text-base font-bold text-primary bg-primary/20 px-4 py-2 rounded-full mt-3 animate-pulse">
              🏆 Liderando
            </span>
          )}
        </div>
      </div>
    );
  }

  if (layout === "horizontal") {
    return (
      <div className="flex items-center justify-center gap-8 md:gap-16">
        <div className="flex flex-col items-center relative">
          {isLionessWinning && (
            <div className="winner-crown">
              <Crown className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className={`${sizeClasses[size]} relative`}>
            <img
              src={brasaoLioness}
              alt="Brasão Lioness Team"
              className={`w-full h-full object-contain drop-shadow-2xl ${isLionessWinning ? "winner-badge" : ""}`}
              style={{ filter: "drop-shadow(0 0 20px hsl(43 65% 52% / 0.4))" }}
            />
          </div>
          <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-3`}>
            Lioness Team
          </h3>
        </div>

        <div className="flex flex-col items-center relative">
          {isTroiaWinning && (
            <div className="winner-crown">
              <Crown className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className={`${sizeClasses[size]} relative`}>
            <img
              src={brasaoTroia}
              alt="Brasão Tróia Team"
              className={`w-full h-full object-contain drop-shadow-2xl ${isTroiaWinning ? "winner-badge" : ""}`}
              style={{ filter: "drop-shadow(0 0 20px hsl(43 65% 52% / 0.4))" }}
            />
          </div>
          <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-3`}>
            Tróia Team
          </h3>
        </div>
      </div>
    );
  }

  // Versus layout (default)
  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      <div className="flex flex-col items-center animate-slide-up relative">
        {isLionessWinning && (
          <div className="winner-crown z-20">
            <Crown className="w-10 h-10 text-primary animate-float" />
          </div>
        )}
        <div className={`${sizeClasses[size]} relative group`}>
          <div className={`absolute inset-0 rounded-full blur-3xl transition-all ${
            isLionessWinning ? "bg-primary/40" : "bg-primary/20 group-hover:bg-primary/30"
          }`} />
          <img
            src={brasaoLioness}
            alt="Brasão Lioness Team"
            className={`w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300 ${
              isLionessWinning ? "winner-badge" : ""
            }`}
            style={{ filter: `drop-shadow(0 0 ${isLionessWinning ? "40px" : "30px"} hsl(43 65% 52% / ${isLionessWinning ? "0.7" : "0.5"}))` }}
          />
        </div>
        <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-4`}>
          Lioness Team
        </h3>
        {isLionessWinning && (
          <span className="text-xs font-semibold text-primary bg-primary/20 px-3 py-1 rounded-full mt-2 animate-pulse">
            🏆 Liderando
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className="text-4xl md:text-6xl font-black text-primary animate-pulse">
          VS
        </span>
      </div>

      <div className="flex flex-col items-center animate-slide-up relative" style={{ animationDelay: "0.1s" }}>
        {isTroiaWinning && (
          <div className="winner-crown z-20">
            <Crown className="w-10 h-10 text-primary animate-float" />
          </div>
        )}
        <div className={`${sizeClasses[size]} relative group`}>
          <div className={`absolute inset-0 rounded-full blur-3xl transition-all ${
            isTroiaWinning ? "bg-primary/40" : "bg-info/20 group-hover:bg-info/30"
          }`} />
          <img
            src={brasaoTroia}
            alt="Brasão Tróia Team"
            className={`w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300 ${
              isTroiaWinning ? "winner-badge" : ""
            }`}
            style={{ filter: `drop-shadow(0 0 ${isTroiaWinning ? "40px" : "30px"} hsl(${isTroiaWinning ? "43 65% 52%" : "217 91% 60%"} / ${isTroiaWinning ? "0.7" : "0.5"}))` }}
          />
        </div>
        <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-4`}>
          Tróia Team
        </h3>
        {isTroiaWinning && (
          <span className="text-xs font-semibold text-primary bg-primary/20 px-3 py-1 rounded-full mt-2 animate-pulse">
            🏆 Liderando
          </span>
        )}
      </div>
    </div>
  );
};

export default TeamBadgesDisplay;
