import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Trash2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceRecordButtonProps {
  disabled?: boolean;
  onAudioReady: (audioBlob: Blob, durationSeconds: number) => void;
  sending?: boolean;
  className?: string;
}

export function VoiceRecordButton({ 
  disabled, 
  onAudioReady, 
  sending,
  className 
}: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Use webm/opus for better compression, fallback to other formats
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/wav';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error('[VoiceRecord] Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Microfone não encontrado.');
      } else {
        toast.error('Erro ao acessar microfone.');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    // Stop if still recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Reset state
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [isRecording, audioUrl]);

  const sendAudio = useCallback(() => {
    if (audioBlob) {
      onAudioReady(audioBlob, recordingTime);
      // Reset after sending
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
    }
  }, [audioBlob, recordingTime, audioUrl, onAudioReady]);

  // Recording in progress
  if (isRecording) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-full animate-pulse">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            {formatTime(recordingTime)}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={cancelRecording}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button 
          variant="default" 
          size="icon" 
          onClick={stopRecording}
          className="h-9 w-9 bg-destructive hover:bg-destructive/90"
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Audio ready to send
  if (audioBlob && audioUrl) {
    return (
      <div className={cn("flex items-center gap-2 flex-1", className)}>
        <audio 
          src={audioUrl} 
          controls 
          className="h-9 flex-1 max-w-[200px]"
        />
        <span className="text-xs text-muted-foreground">
          {formatTime(recordingTime)}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={cancelRecording}
          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
          disabled={sending}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button 
          variant="default" 
          size="icon" 
          onClick={sendAudio}
          className="h-9 w-9 shrink-0"
          disabled={sending}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  // Default: mic button
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className={cn("h-9 w-9 shrink-0", className)}
      disabled={disabled || sending}
      onClick={startRecording}
    >
      {sending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}
