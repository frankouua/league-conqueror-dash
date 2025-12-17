import { Clock, Calendar, CalendarDays } from "lucide-react";

interface TimeCountersProps {
  daysRemainingMonth: number;
  daysRemainingSemester: number;
  daysRemainingYear: number;
}

const TimeCounters = ({
  daysRemainingMonth,
  daysRemainingSemester,
  daysRemainingYear,
}: TimeCountersProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Days Remaining - Month */}
      <div className="bg-gradient-card rounded-xl p-5 border border-border text-center">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Clock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{daysRemainingMonth}</p>
        <p className="text-muted-foreground text-sm">dias restantes no mês</p>
      </div>

      {/* Days Remaining - Semester */}
      <div className="bg-gradient-card rounded-xl p-5 border border-border text-center">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-xl bg-info/10">
            <Calendar className="w-5 h-5 text-info" />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{daysRemainingSemester}</p>
        <p className="text-muted-foreground text-sm">dias restantes no semestre</p>
      </div>

      {/* Days Remaining - Year */}
      <div className="bg-gradient-card rounded-xl p-5 border border-border text-center">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-xl bg-success/10">
            <CalendarDays className="w-5 h-5 text-success" />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{daysRemainingYear}</p>
        <p className="text-muted-foreground text-sm">dias restantes no ano</p>
      </div>
    </div>
  );
};

export default TimeCounters;
