import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

interface TeamBadgesDisplayProps {
  layout?: "horizontal" | "versus";
  size?: "sm" | "md" | "lg";
}

const TeamBadgesDisplay = ({ layout = "versus", size = "lg" }: TeamBadgesDisplayProps) => {
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

  if (layout === "horizontal") {
    return (
      <div className="flex items-center justify-center gap-8 md:gap-16">
        <div className="flex flex-col items-center">
          <div className={`${sizeClasses[size]} relative`}>
            <img
              src={brasaoLioness}
              alt="Brasão Lioness Team"
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 0 20px hsl(43 65% 52% / 0.4))" }}
            />
          </div>
          <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-3`}>
            Lioness Team
          </h3>
        </div>

        <div className="flex flex-col items-center">
          <div className={`${sizeClasses[size]} relative`}>
            <img
              src={brasaoTroia}
              alt="Brasão Tróia Team"
              className="w-full h-full object-contain drop-shadow-2xl"
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
      <div className="flex flex-col items-center animate-slide-up">
        <div className={`${sizeClasses[size]} relative group`}>
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all" />
          <img
            src={brasaoLioness}
            alt="Brasão Lioness Team"
            className="w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
            style={{ filter: "drop-shadow(0 0 30px hsl(43 65% 52% / 0.5))" }}
          />
        </div>
        <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-4`}>
          Lioness Team
        </h3>
      </div>

      <div className="flex flex-col items-center justify-center">
        <span className="text-4xl md:text-6xl font-black text-primary animate-pulse">
          VS
        </span>
      </div>

      <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className={`${sizeClasses[size]} relative group`}>
          <div className="absolute inset-0 bg-info/20 rounded-full blur-3xl group-hover:bg-info/30 transition-all" />
          <img
            src={brasaoTroia}
            alt="Brasão Tróia Team"
            className="w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
            style={{ filter: "drop-shadow(0 0 30px hsl(217 91% 60% / 0.5))" }}
          />
        </div>
        <h3 className={`${textSizes[size]} font-bold text-gradient-gold mt-4`}>
          Tróia Team
        </h3>
      </div>
    </div>
  );
};

export default TeamBadgesDisplay;
