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
    sm: "w-16 h-16 sm:w-20 sm:h-20",
    md: "w-24 h-24 sm:w-32 sm:h-32",
    lg: "w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48",
    xl: "w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48 lg:w-56 lg:h-56",
  };

  const textSizes = {
    sm: "text-xs sm:text-sm",
    md: "text-sm sm:text-lg",
    lg: "text-base sm:text-xl md:text-2xl",
    xl: "text-base sm:text-xl md:text-2xl lg:text-3xl",
  };

  const pointsSizes = {
    sm: "text-base sm:text-lg",
    md: "text-lg sm:text-2xl",
    lg: "text-xl sm:text-3xl md:text-4xl",
    xl: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
  };

  const isLionessWinning = winningTeam === "lioness";
  const isTroiaWinning = winningTeam === "troia";
  
  // Map team data to correct team based on name, not position
  const lionessData = team1?.name.toLowerCase().includes("lioness") ? team1 : 
                      team2?.name.toLowerCase().includes("lioness") ? team2 : null;
  const troiaData = team1?.name.toLowerCase().includes("tr") ? team1 : 
                    team2?.name.toLowerCase().includes("tr") ? team2 : null;
  
  const pointsDifference = team1 && team2 ? Math.abs(team1.totalPoints - team2.totalPoints) : 0;
  const totalRevenue = (lionessData?.totalRevenue || 0) + (troiaData?.totalRevenue || 0);

  // TV-optimized layout for large screens
  if (layout === "tv") {
    return (
      <div className="flex items-start justify-center gap-3 sm:gap-6 md:gap-12 lg:gap-20 py-4 sm:py-8">
        {/* Lioness Team */}
        <div className="flex flex-col items-center">
          {/* Crown placeholder - always takes space */}
          <div className="h-6 sm:h-10 md:h-14 flex items-center justify-center mb-2">
            {isLionessWinning && (
              <Crown className="w-6 h-6 sm:w-10 sm:h-10 md:w-14 md:h-14 text-primary animate-float" />
            )}
          </div>
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
              <div className="mt-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-success/10 border border-success/20">
                <p className="text-success text-xs sm:text-base md:text-lg lg:text-xl font-bold">
                  R$ {lionessData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
          
          {/* Leader badge placeholder - always takes space */}
          <div className="h-8 sm:h-10 mt-2 sm:mt-3 flex items-center justify-center">
            {isLionessWinning && (
              <span className="text-[10px] sm:text-sm md:text-base font-bold text-primary bg-primary/20 px-2 sm:px-4 py-1 sm:py-2 rounded-full animate-pulse">
                🏆 Líder
              </span>
            )}
          </div>
        </div>

        {/* VS Separator with Total Revenue */}
        <div className="flex flex-col items-center justify-center gap-4 pt-6 sm:pt-10 md:pt-14">
          <span className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-primary animate-pulse">
            VS
          </span>
          
          {/* Total Revenue Display */}
          <div className="flex flex-col items-center bg-gradient-to-b from-primary/20 to-transparent rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-primary/30">
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Total Vendido
            </p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-gradient-gold">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Tróia Team */}
        <div className="flex flex-col items-center">
          {/* Crown placeholder - always takes space */}
          <div className="h-6 sm:h-10 md:h-14 flex items-center justify-center mb-2">
            {isTroiaWinning && (
              <Crown className="w-6 h-6 sm:w-10 sm:h-10 md:w-14 md:h-14 text-primary animate-float" />
            )}
          </div>
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
              <div className="mt-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-success/10 border border-success/20">
                <p className="text-success text-xs sm:text-base md:text-lg lg:text-xl font-bold">
                  R$ {troiaData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
          
          {/* Leader badge placeholder - always takes space */}
          <div className="h-8 sm:h-10 mt-2 sm:mt-3 flex items-center justify-center">
            {isTroiaWinning && (
              <span className="text-[10px] sm:text-sm md:text-base font-bold text-primary bg-primary/20 px-2 sm:px-4 py-1 sm:py-2 rounded-full animate-pulse">
                🏆 Líder
              </span>
            )}
          </div>
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
