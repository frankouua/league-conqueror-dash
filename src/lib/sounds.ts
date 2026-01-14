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

// Leadership change sound - basic version
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

// Epic victory fanfare - when user's team takes the lead
export const playVictoryFanfare = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Epic fanfare melody
    const fanfare = [
      { freq: 392.00, time: 0, duration: 0.15 },      // G4
      { freq: 392.00, time: 0.15, duration: 0.15 },   // G4
      { freq: 392.00, time: 0.30, duration: 0.15 },   // G4
      { freq: 311.13, time: 0.45, duration: 0.35 },   // Eb4
      { freq: 466.16, time: 0.85, duration: 0.1 },    // Bb4
      { freq: 392.00, time: 0.95, duration: 0.15 },   // G4
      { freq: 311.13, time: 1.10, duration: 0.35 },   // Eb4
      { freq: 523.25, time: 1.50, duration: 0.6 },    // C5 (held)
    ];

    fanfare.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "triangle", 0.25);
    });

    // Add bass notes for power
    const bass = [
      { freq: 130.81, time: 0, duration: 0.8 },       // C3
      { freq: 155.56, time: 0.85, duration: 0.65 },   // Eb3
      { freq: 196.00, time: 1.50, duration: 0.6 },    // G3
    ];

    bass.forEach(({ freq, time, duration }) => {
      playNote(ctx, freq, now + time, duration, "sawtooth", 0.12);
    });

    // Add harmony chords
    setTimeout(() => {
      const ctx2 = getAudioContext();
      const now2 = ctx2.currentTime;
      
      // Victory chord
      playNote(ctx2, 261.63, now2, 0.5, "sine", 0.15);
      playNote(ctx2, 329.63, now2, 0.5, "sine", 0.15);
      playNote(ctx2, 392.00, now2, 0.5, "sine", 0.15);
      playNote(ctx2, 523.25, now2, 0.5, "sine", 0.15);
    }, 1500);

    // Final sparkle
    setTimeout(() => {
      playSparkle();
    }, 2000);

  } catch (error) {
    console.warn("Victory fanfare failed:", error);
  }
};

// Defeat sound - when user's team loses the lead
export const playDefeatSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Descending sad notes
    playNote(ctx, 392.00, now, 0.2, "sine", 0.15);
    playNote(ctx, 349.23, now + 0.2, 0.2, "sine", 0.12);
    playNote(ctx, 311.13, now + 0.4, 0.3, "sine", 0.1);
  } catch (error) {
    console.warn("Defeat sound failed:", error);
  }
};

// 🔔 Notification sound for urgent referrals - attention-grabbing but not annoying
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two-tone notification chime (like WhatsApp/iMessage)
    playNote(ctx, 880, now, 0.08, "sine", 0.25);        // A5 - first ping
    playNote(ctx, 1318.51, now + 0.1, 0.12, "sine", 0.2); // E6 - second higher ping
    
    // Subtle harmonic underneath
    playNote(ctx, 440, now + 0.05, 0.15, "triangle", 0.08);
  } catch (error) {
    console.warn("Notification sound failed:", error);
  }
};

// 🚨 Urgent alert sound for important notifications
export const playUrgentAlertSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Three ascending chimes - more attention-grabbing
    playNote(ctx, 659.25, now, 0.1, "sine", 0.3);         // E5
    playNote(ctx, 830.61, now + 0.12, 0.1, "sine", 0.3);  // Ab5
    playNote(ctx, 1046.50, now + 0.24, 0.15, "sine", 0.35); // C6
    
    // Quick second burst after a pause
    playNote(ctx, 659.25, now + 0.5, 0.08, "sine", 0.25);
    playNote(ctx, 830.61, now + 0.58, 0.08, "sine", 0.25);
    playNote(ctx, 1046.50, now + 0.66, 0.12, "sine", 0.3);
  } catch (error) {
    console.warn("Urgent alert sound failed:", error);
  }
};
