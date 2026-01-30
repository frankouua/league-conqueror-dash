import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  duration?: number; // Duration in seconds (optional, will be computed if not provided)
  fromMe?: boolean;
  compact?: boolean;
  className?: string;
  onError?: () => void;
}

export function AudioPlayer({ 
  src, 
  duration: providedDuration, 
  fromMe = false,
  compact = false,
  className,
  onError 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(providedDuration || 0);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (isFinite(audioDuration)) {
        setDuration(audioDuration);
      }
    }
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Handle audio ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Handle audio error
  const handleError = useCallback(() => {
    setHasError(true);
    setIsPlaying(false);
    onError?.();
  }, [onError]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current || hasError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setHasError(true);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, hasError]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || hasError) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, hasError]);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center gap-2 py-1",
        className
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
        )}>
          <Mic className="w-4 h-4 opacity-50" />
        </div>
        <span className="text-xs opacity-50">Áudio indisponível</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "py-0.5" : "py-1",
      className
    )}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full shrink-0 transition-colors",
          fromMe 
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" 
            : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>

      {/* Progress bar and time */}
      <div className="flex-1 flex flex-col gap-1 min-w-[100px] max-w-[180px]">
        {/* Waveform / Progress bar */}
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className={cn(
            "relative h-2 rounded-full cursor-pointer overflow-hidden",
            fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
          )}
        >
          {/* Progress fill */}
          <div 
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all",
              fromMe ? "bg-primary-foreground/60" : "bg-muted-foreground/40"
            )}
            style={{ width: `${progress}%` }}
          />
          
          {/* Simulated waveform bars (decorative) */}
          <div className="absolute inset-0 flex items-center justify-around px-1 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-[2px] rounded-full",
                  i <= (progress / 100) * 20 
                    ? (fromMe ? "bg-primary-foreground/80" : "bg-muted-foreground/60")
                    : (fromMe ? "bg-primary-foreground/30" : "bg-muted-foreground/25")
                )}
                style={{ 
                  height: `${Math.sin((i * 0.7) + 1) * 40 + 30}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Time display */}
        <div className="flex justify-between text-[10px] opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Mic icon indicator */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
        fromMe ? "bg-primary-foreground/15" : "bg-muted-foreground/10"
      )}>
        <Mic className="w-3.5 h-3.5 opacity-60" />
      </div>
    </div>
  );
}
