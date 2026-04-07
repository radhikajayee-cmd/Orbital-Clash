// Web Audio API Synthesizer
let audioCtx;
let ENABLE_SFX = true;
let ENABLE_MUSIC = true;

export const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const saved = localStorage.getItem('bubble_shooter_save_v1');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.settings) {
            ENABLE_SFX = data.settings.sfx !== false;
            ENABLE_MUSIC = data.settings.music !== false;
        }
    }
};

export const setSfxEnabled = (enabled) => {
    ENABLE_SFX = enabled;
};

export const playBackgroundMusic = () => {
    if (!ENABLE_MUSIC || !audioCtx) return;
    
    // Resume context if suspended
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Simple procedural background music
    const playNote = (freq, duration, delay) => {
        setTimeout(() => {
            if (!ENABLE_MUSIC) return;
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }, delay);
    };
    
    // Simple melody loop
    const melody = [
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25
    ];
    
    let delay = 0;
    const loopMusic = () => {
        if (!ENABLE_MUSIC) return;
        
        melody.forEach((freq, i) => {
            playNote(freq, 0.5, delay + i * 300);
            playNote(freq * 1.5, 0.3, delay + i * 300 + 150); // Harmony
        });
        
        delay += melody.length * 300;
        setTimeout(loopMusic, melody.length * 300);
    };
    
    loopMusic();
};

export const stopBackgroundMusic = () => {
    // Procedural music stops automatically when ENABLE_MUSIC is false
    ENABLE_MUSIC = false;
};

const playTone = (freq, type, duration, vol = 0.1, slideFreq = null) => {
    if (!ENABLE_SFX || !audioCtx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const AudioMap = {
    shoot: () => playTone(300, 'sine', 0.2, 0.2, 800),
    pop: () => playTone(800, 'sine', 0.1, 0.1, 1200),
    drop: () => playTone(400, 'triangle', 0.3, 0.1, 200),
    combo: (level) => playTone(400 + (level * 100), 'square', 0.2, 0.1),
    win: () => {
        playTone(400, 'sine', 0.1, 0.2, 600);
        setTimeout(() => playTone(600, 'sine', 0.1, 0.2, 800), 100);
        setTimeout(() => playTone(800, 'sine', 0.4, 0.2, 1200), 200);
    },
    lose: () => {
        playTone(300, 'sawtooth', 0.3, 0.2, 200);
        setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.2, 100), 300);
    },
    click: () => playTone(1000, 'sine', 0.05, 0.1)
};
