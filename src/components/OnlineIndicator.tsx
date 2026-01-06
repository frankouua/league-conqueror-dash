import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showPulse?: boolean;
}

const OnlineIndicator = ({ 
  isOnline, 
  size = "md", 
  className,
  showPulse = true 
}: OnlineIndicatorProps) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  if (!isOnline) return null;

  return (
    <span
      className={cn(
        "rounded-full bg-green-500 border-2 border-background",
        sizeClasses[size],
        showPulse && "animate-pulse",
        className
      )}
      title="Online agora"
    />
  );
};

export default OnlineIndicator;
