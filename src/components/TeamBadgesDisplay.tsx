import { Crown } from "lucide-react";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface TeamBadgesDisplayProps {
  layout?: "horizontal" | "versus";
  size?: "sm" | "md" | "lg";
  winningTeam?: "lioness" | "troia" | "tie" | null;
}

const TeamBadgesDisplay = ({ layout = "versus", size = "lg", winningTeam = null }: TeamBadgesDisplayProps) => {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40 md:w-48 md:h-48",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl md:text-2xl",
  };

  const isLionessWinning = winningTeam === "lioness";
  const isTroiaWinning = winningTeam === "troia";

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

  // Versus layout
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
