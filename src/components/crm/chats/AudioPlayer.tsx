import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  duration?: number; // Duration in seconds (optional, will be computed if not provided)
  fromMe?: boolean;
  compact?: boolean;
  className?: string;
  onError?: () => void;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

// Historicamente tentávamos baixar o áudio do media-proxy via `fetch()` (com headers).
// Porém isso dispara preflight/CORS e pode falhar como `TypeError: Failed to fetch`,
// deixando o player sem play. Para reprodução, o <audio> consegue tocar direto da URL
// do proxy sem headers customizados, então desabilitamos esse caminho.
function needsAuthenticatedFetch(_url: string): boolean {
  return false;
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
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch autenticado para URLs que passam pelo proxy
  const shouldFetchWithAuth = useMemo(() => needsAuthenticatedFetch(src), [src]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function fetchAudioBlob() {
      if (!shouldFetchWithAuth || !src) {
        setBlobUrl(null);
        return;
      }

      setIsLoading(true);

      try {
        // Mantido apenas por compatibilidade caso voltemos a usar esse caminho.
        // Atualmente `shouldFetchWithAuth` é sempre false.
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`media-proxy http ${resp.status}`);

        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[AudioPlayer] Failed to fetch audio:', err);
        if (!cancelled) {
          setBlobUrl(null);
          setIsLoading(false);
          setHasError(true);
          onError?.();
        }
      }
    }

    fetchAudioBlob();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, shouldFetchWithAuth, onError]);

  // URL final para o elemento de áudio
  const audioSrc = useMemo(() => {
    if (shouldFetchWithAuth) return blobUrl;
    return src;
  }, [shouldFetchWithAuth, blobUrl, src]);
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
    if (!audioRef.current || hasError || isLoading || !audioSrc) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        setHasError(true);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, hasError, isLoading, audioSrc]);

  // Cycle playback speed
  const cycleSpeed = useCallback(() => {
    if (!audioRef.current) return;
    
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    audioRef.current.playbackRate = newSpeed;
  }, [playbackSpeed]);

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

  // Generate waveform heights (deterministic based on src)
  const waveformHeights = useRef<number[]>(
    Array.from({ length: 28 }, (_, i) => Math.sin((i * 0.8) + 1) * 40 + 30)
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-xl",
        fromMe ? "bg-primary/10" : "bg-muted",
        className
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/30" : "bg-primary/90"
        )}>
          <Loader2 className={cn(
            "w-5 h-5 animate-spin",
            fromMe ? "text-primary-foreground" : "text-primary-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <div className="h-6 flex items-center gap-[2px]">
            {waveformHeights.current.map((height, i) => (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full",
                  fromMe ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
                )}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <span className={cn(
            "text-[10px]",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            Carregando...
          </span>
        </div>
      </div>
    );
  }

  if (hasError || !audioSrc) {
    return (
      <div className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-xl",
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
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioSrc}
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

      {/* Progress bar and waveform */}
      <div className="flex-1 flex flex-col gap-1 min-w-[120px]">
        {/* Waveform / Progress bar */}
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="relative h-6 cursor-pointer flex items-center"
        >
          {/* Waveform bars */}
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {waveformHeights.current.map((height, i) => {
              const barProgress = (i / waveformHeights.current.length) * 100;
              const isPlayed = barProgress <= progress;
              
              return (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full transition-colors",
                    isPlayed 
                      ? (fromMe ? "bg-primary-foreground/80" : "bg-primary")
                      : (fromMe ? "bg-primary-foreground/30" : "bg-muted-foreground/30")
                  )}
                  style={{ 
                    height: `${height}%`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Time display */}
        <div className="flex justify-between items-center text-[10px]">
          <span className={cn(
            "font-medium",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
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
