// Celebration sound using Web Audio API - no external dependencies needed

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play a note with the given frequency and duration
const playNote = (
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

// Celebration fanfare for winning streak
export const playStreakCelebration = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Fanfare melody - triumphant ascending notes
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },      // C5
      { freq: 659.25, time: 0.12, duration: 0.15 },   // E5
      { freq: 783.99, time: 0.24, duration: 0.15 },   // G5
      { freq: 1046.50, time: 0.36, duration: 0.4 },   // C6 (held)
    ];

    // Play melody
    notes.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "triangle", 0.25);
    });

    // Add harmony
    const harmony = [
      { freq: 261.63, time: 0.36, duration: 0.4 },    // C4
      { freq: 329.63, time: 0.36, duration: 0.4 },    // E4
      { freq: 392.00, time: 0.36, duration: 0.4 },    // G4
    ];

    harmony.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "sine", 0.15);
    });

    // Add sparkle effect
    setTimeout(() => {
      playSparkle();
    }, 500);

  } catch (error) {
    console.warn("Audio playback failed:", error);
  }
};

// Sparkle/chime effect
const playSparkle = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const sparkles = [
      { freq: 2093, time: 0, duration: 0.1 },
      { freq: 2349, time: 0.05, duration: 0.1 },
      { freq: 2637, time: 0.1, duration: 0.1 },
      { freq: 3136, time: 0.15, duration: 0.15 },
    ];

    sparkles.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "sine", 0.08);
    });
  } catch (error) {
    console.warn("Sparkle sound failed:", error);
  }
};

// Simple success sound
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playNote(ctx, 523.25, now, 0.1, "sine", 0.2);
    playNote(ctx, 659.25, now + 0.1, 0.1, "sine", 0.2);
    playNote(ctx, 783.99, now + 0.2, 0.2, "sine", 0.25);
  } catch (error) {
    console.warn("Success sound failed:", error);
  }
};

// Goal reached celebration
export const playGoalSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ascending triumphant arpeggio
    const notes = [
      { freq: 392, time: 0, duration: 0.12 },
      { freq: 493.88, time: 0.1, duration: 0.12 },
      { freq: 587.33, time: 0.2, duration: 0.12 },
      { freq: 783.99, time: 0.3, duration: 0.3 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "triangle", 0.2);
    });
  } catch (error) {
    console.warn("Goal sound failed:", error);
  }
};

// Leadership change sound
export const playLeadershipSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dramatic chord
    playNote(ctx, 261.63, now, 0.4, "sawtooth", 0.1);
    playNote(ctx, 329.63, now, 0.4, "sawtooth", 0.1);
    playNote(ctx, 392, now, 0.4, "sawtooth", 0.1);
    playNote(ctx, 523.25, now + 0.1, 0.5, "triangle", 0.2);
  } catch (error) {
    console.warn("Leadership sound failed:", error);
  }
};
