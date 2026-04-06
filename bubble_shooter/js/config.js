export const CONFIG = {
    // Game Physics & Timing
    FPS: 60,
    BUBBLE_SPEED: 1000, // pixels per second
    FALL_SPEED: 600,
    AIM_LINE_LENGTH: 400,
    
    // Screen Shake
    SHAKE_INTENSITY: 8,
    SHAKE_DURATION: 0.3,
    
    // Shots System
    MAX_SHOTS: 30,
    
    // Grid Settings
    HEX_RADIUS: 20, // To be scaled dynamically later
    ROWS: 12,
    COLS: 11,
    START_ROWS_CLASSIC: 5,
    
    // Colors (High quality gradients)
    COLORS: [
        '#ff0000', // Red
        '#00ff00', // Lime Green
        '#00bfff', // Deep Sky Blue
        '#ff8c00', // Orange
        '#ff1493', // Deep Pink
        '#9932cc'  // Dark Orchid (Purple)
    ],
    SPECIAL_COLORS: {
        BOMB: '#000000',
        RAINBOW: 'RAINBOW',
        FIRE: '#ff8c00'
    },
    
    // Scoring
    POINTS_POP: 10,
    POINTS_DROP: 20,
    COMBO_MULTIPLIER_BASE: 1.2,
    
    // State
    STATE_MENU: 0,
    STATE_PLAYING: 1,
    STATE_PAUSED: 2,
    STATE_GAMEOVER: 3
};
