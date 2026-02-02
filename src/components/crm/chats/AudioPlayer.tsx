import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  fromMe?: boolean;
  compact?: boolean;
  className?: string;
  onError?: () => void;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const audioRef = useRef<HTMLAudioElement>(null);

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
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      }
      setIsLoaded(true);
    }
  }, []);

  // Handle can play
  const handleCanPlay = useCallback(() => {
    setIsLoaded(true);
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
    console.error('[AudioPlayer] Error loading audio:', src);
    setHasError(true);
    setIsPlaying(false);
    onError?.();
  }, [onError, src]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current || hasError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error('[AudioPlayer] Play failed:', err);
        setHasError(true);
        onError?.();
      });
      setIsPlaying(true);
    }
  }, [isPlaying, hasError, onError]);

  // Cycle playback speed
  const cycleSpeed = useCallback(() => {
    if (!audioRef.current) return;
    
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    audioRef.current.playbackRate = newSpeed;
  }, [playbackSpeed]);

  // Handle slider change
  const handleSliderChange = useCallback((value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Sync playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Calculate progress percentage for visual bar
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError || !src) {
    return (
      <div className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-xl",
        fromMe ? "bg-primary/10" : "bg-muted",
        className
      )}>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          fromMe ? "bg-primary/20" : "bg-muted-foreground/10"
        )}>
          <Mic className="w-4 h-4 opacity-50" />
        </div>
        <span className="text-xs opacity-50">Áudio indisponível</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-xl",
      compact ? "py-1.5 px-2" : "py-2 px-3",
      className
    )}>
      {/* Hidden audio element - no crossOrigin to avoid CORS issues with proxy */}
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full shrink-0 transition-all",
          fromMe 
            ? "bg-primary-foreground/30 hover:bg-primary-foreground/50 text-primary-foreground" 
            : "bg-primary/90 hover:bg-primary text-primary-foreground"
        )}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        )}
      </Button>

      {/* Progress slider and time */}
      <div className="flex-1 flex flex-col gap-1 min-w-[120px]">
        {/* Slider */}
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSliderChange}
          className={cn(
            "cursor-pointer",
            fromMe ? "[&>span:first-child]:bg-primary-foreground/30 [&_[role=slider]]:bg-primary-foreground" : ""
          )}
        />

        {/* Time display */}
        <div className="flex justify-between items-center text-[10px]">
          <span className={cn(
            "font-medium",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(currentTime)}
          </span>
          <span className={cn(
            "font-medium",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Speed control button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={cycleSpeed}
        className={cn(
          "h-7 px-2 text-[11px] font-bold rounded-full shrink-0 transition-colors",
          fromMe 
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
            : "bg-muted-foreground/10 hover:bg-muted-foreground/20 text-muted-foreground"
        )}
      >
        {playbackSpeed}x
      </Button>

      {/* Mic icon indicator */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        fromMe ? "bg-primary-foreground/15" : "bg-muted-foreground/10"
      )}>
        <Mic className={cn(
          "w-4 h-4",
          fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
        )} />
      </div>
    </div>
  );
}
