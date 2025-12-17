import { Star, Award, AlertTriangle, Trophy, Users, Heart } from "lucide-react";

interface Achievement {
  id: string;
  type: "referral" | "testimonial" | "card_blue" | "card_white" | "card_yellow" | "card_red" | "goal" | "ambassador";
  teamName: string;
  description: string;
  timestamp: string;
  points?: number;
}

interface RecentAchievementsProps {
  achievements: Achievement[];
}

const getAchievementIcon = (type: Achievement["type"]) => {
  switch (type) {
    case "referral":
      return <Users className="w-5 h-5 text-info" />;
    case "testimonial":
      return <Star className="w-5 h-5 text-primary" />;
    case "card_blue":
      return <Award className="w-5 h-5 text-info" />;
    case "card_white":
      return <Award className="w-5 h-5 text-foreground" />;
    case "card_yellow":
      return <AlertTriangle className="w-5 h-5 text-warning" />;
    case "card_red":
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case "goal":
      return <Trophy className="w-5 h-5 text-primary" />;
    case "ambassador":
      return <Heart className="w-5 h-5 text-pink-500" />;
    default:
      return <Star className="w-5 h-5 text-muted-foreground" />;
  }
};

const getAchievementBg = (type: Achievement["type"]) => {
  switch (type) {
    case "referral":
      return "bg-info/10";
    case "testimonial":
      return "bg-primary/10";
    case "card_blue":
      return "bg-info/10";
    case "card_white":
      return "bg-foreground/10";
    case "card_yellow":
      return "bg-warning/10";
    case "card_red":
      return "bg-destructive/10";
    case "goal":
      return "bg-primary/10";
    case "ambassador":
      return "bg-pink-500/10";
    default:
      return "bg-muted";
  }
};

const RecentAchievements = ({ achievements }: RecentAchievementsProps) => {
  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Conquistas Recentes</h3>
          <p className="text-muted-foreground text-sm">
            Últimas atividades da competição
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {achievements.map((achievement, index) => (
          <div
            key={achievement.id}
            className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`p-2 rounded-lg ${getAchievementBg(achievement.type)}`}>
              {getAchievementIcon(achievement.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium">{achievement.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground text-sm">
                  {achievement.teamName}
                </span>
                <span className="text-muted-foreground text-sm">•</span>
                <span className="text-muted-foreground text-sm">
                  {achievement.timestamp}
                </span>
              </div>
            </div>
            {achievement.points && (
              <span
                className={`px-2 py-1 rounded-full text-sm font-bold ${
                  achievement.points > 0
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {achievement.points > 0 ? "+" : ""}
                {achievement.points}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentAchievements;
