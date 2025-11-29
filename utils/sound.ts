
import { ClickSoundVariant } from '../types';

// Simple audio synthesizer to avoid external assets
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicOscillators: OscillatorNode[] = [];
let isMusicPlaying = false;

// Volume state
let sfxVolume = 0.5;
let musicVolume = 0.0;

const getContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create gain nodes for mixing
    masterGain = audioContext.createGain();
    sfxGain = audioContext.createGain();
    musicGain = audioContext.createGain();

    masterGain.connect(audioContext.destination);
    sfxGain.connect(masterGain);
    musicGain.connect(masterGain);

    // Initialize volumes
    sfxGain.gain.value = sfxVolume;
    musicGain.gain.value = musicVolume;
  }
  return audioContext;
};

export const setVolumes = (sfx: number, music: number) => {
  sfxVolume = sfx;
  musicVolume = music;
  
  if (sfxGain) {
    sfxGain.gain.setTargetAtTime(sfx, audioContext!.currentTime, 0.1);
  }
  if (musicGain) {
    musicGain.gain.setTargetAtTime(music, audioContext!.currentTime, 0.1);
  }

  // Manage music state based on volume
  if (music > 0 && !isMusicPlaying) {
    startAmbientMusic();
  } else if (music === 0 && isMusicPlaying) {
    stopAmbientMusic();
  }
};

const startAmbientMusic = () => {
  const ctx = getContext();
  if (isMusicPlaying) return;

  isMusicPlaying = true;
  musicOscillators = [];

  // Create a binaural drone effect
  // Base freq around 60Hz (B1) for a deep zen feel
  const freqs = [60, 64]; 

  freqs.forEach(f => {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = f;

    // Subtle modulation
    lfo.frequency.value = 0.1 + Math.random() * 0.1;
    lfoGain.gain.value = 2; // Modulate frequency by +/- 2Hz

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.connect(musicGain!);
    
    osc.start();
    lfo.start();
    
    musicOscillators.push(osc);
    musicOscillators.push(lfo); // Keep track to stop later
  });
};

const stopAmbientMusic = () => {
  musicOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {
      // Ignore if already stopped
    }
  });
  musicOscillators = [];
  isMusicPlaying = false;
};

export const playSound = (type: 'click' | 'buy' | 'success' | 'prestige' | 'pop' | ClickSoundVariant) => {
  // If volume is 0, don't even create oscillators
  if (sfxVolume <= 0) return;

  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  // Ensure music is running if volume allows (in case resume needed)
  if (musicVolume > 0 && !isMusicPlaying) {
      startAmbientMusic();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Connect to SFX bus instead of destination directly
  osc.connect(gain);
  gain.connect(sfxGain!); 

  const now = ctx.currentTime;

  switch (type) {
    case 'click':
    case 'default':
      // Short high pitch click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.3, now); // Relative level
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    
    case 'blaster':
      // Laser / Sci-fi pew
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'bubble':
      // Water droplet / Bubble
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'mechanical':
      // Click clack keyboard sound simulation
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'buy':
      // "Coin" sound - two notes
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'success':
      // Major chord arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(sfxGain!);
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i * 0.05);
        g.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
        o.start(now + i * 0.05);
        o.stop(now + i * 0.05 + 0.4);
      });
      break;

    case 'prestige':
        // Deep swelling sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 2);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 1);
        gain.gain.linearRampToValueAtTime(0, now + 3);
        osc.start(now);
        osc.stop(now + 3);
        
        // Add some noise or shimmer
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(sfxGain!);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(100, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 2.5);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.05, now + 1);
        gain2.gain.linearRampToValueAtTime(0, now + 3);
        osc2.start(now);
        osc2.stop(now + 3);
        break;
      
    case 'pop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
  }
};
