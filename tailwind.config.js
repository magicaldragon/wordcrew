/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}'],
  // Các class được dựng động trong code nên scanner không trích xuất được -> khai báo tường minh.
  safelist: [
    'animate-catHappyJump',
    'animate-catSadAppear',
    'text-[clamp(2.5rem,10vw,6rem)]',
    'text-[clamp(2.5rem,10vmin,6rem)]',
    'text-[clamp(3rem,13vw,9rem)]',
    'text-[clamp(3rem,13vmin,9rem)]',
    'text-[clamp(4rem,16vw,12rem)]',
    'text-[clamp(4rem,16vmin,12rem)]',
    'text-[clamp(5rem,20vw,15rem)]',
    'text-[clamp(5rem,20vmin,15rem)]',
  ],
  theme: {
    extend: {
      colors: {
        'dark-metal': '#1A1A2E', // Very dark blue/purple, good for backgrounds
        'cyber-purple': '#5E2ABF', // Vibrant purple
        'neon-green': '#39FF14', // Accent green
        'electric-blue': '#00FFFF', // Accent blue/cyan
        'light-text': '#EAEAEA', // Primary text on dark backgrounds
        'muted-text': '#A0A0B8', // Secondary text
        'danger-red': '#FF4136',
        'warning-yellow': '#FFDC00',
      },
      fontFamily: {
        sans: ['Exo 2', 'sans-serif'],
        heading: ['Orbitron', 'sans-serif'],
      },
      animation: {
        fadeInScaleUp: 'fadeInScaleUp 0.5s ease-out forwards',
        pulseOnce: 'pulseOnce 0.5s ease-in-out',
        pingOnce: 'pingOnce 0.7s cubic-bezier(0, 0, 0.2, 1) forwards',
        countdownFadeIn: 'countdownFadeIn 0.8s ease-out forwards',
        countdownPulse: 'countdownPulse 1s ease-out forwards',
        goEffect: 'goEffect 1s ease-out forwards',
        correctFlash: 'correctFlash 0.6s ease-out', // Card flash
        skipFlash: 'skipFlash 0.6s ease-out', // Card flash
        buttonHoverGlow: 'buttonHoverGlow 0.3s ease-out forwards',
        subtlePulse: 'subtlePulse 2s infinite ease-in-out',
        floatUpFadeOut: 'floatUpFadeOut 1.5s ease-out forwards',
        floatUpAndAway: 'floatUpAndAway 1.5s ease-out forwards',
        teamAPulse: 'teamAPulse 1.5s infinite ease-in-out',
        teamBPulse: 'teamBPulse 1.5s infinite ease-in-out',
        rgbBorder: 'rgbBorderAnimation 4s linear infinite',
        catHappyJump: 'catHappyJump 0.8s ease-out forwards',
        catSadAppear: 'catSadAppear 0.8s ease-out forwards',
        starPop: 'starPop 1s ease-out forwards',
        flash: 'flash 1s infinite', // General purpose flash, used for "Rush Hour Over" box
        comboActivatePop: 'comboActivatePop 1.2s ease-out forwards',
        timeBonusFloatUp: 'timeBonusFloatUp 1.5s ease-out forwards',
        powerUpAppear: 'powerUpAppear 1.2s ease-out forwards', // For Power-Up messages
        timerFreezeEffect: 'timerFreezeEffect 0.5s ease-out forwards', // For timer text color cycle
        frostyPulse: 'frostyPulse 2s infinite ease-in-out', // For timer frozen container
        'word-correct-effect': 'wordCorrectEffect 0.7s ease-out forwards',
        'word-skip-effect': 'wordSkipEffect 0.7s ease-out forwards',
        'stamp-effect': 'stampEffect 1.0s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        rushHourGlow: 'rushHourGlowKeyframes 0.7s infinite ease-in-out', // For the glow during Rush Hour
        rushHourBounce: 'rushHourBounce 0.8s ease-in-out infinite', // New bounce animation
        fastRushTextGlow: 'fastRushTextGlow 0.25s infinite ease-in-out', // For Rush Hour text notification
        goldPulseGlow: 'goldPulseGlow 1.5s infinite ease-in-out', // For results screen compliment
        hellTimebarGlow: 'hellTimebarGlow 2s infinite ease-in-out',
        timeDepletedSpark: 'timeDepletedSpark 0.8s ease-out forwards',
        // waterBorderFlow defined via @keyframes directly below
      },
      keyframes: {
        fadeInScaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseOnce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        pingOnce: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%': { transform: 'scale(1.75)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        countdownFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countdownPulse: {
          '0%': { opacity: '0.7', transform: 'scale(0.9)' },
          '25%': { opacity: '1', transform: 'scale(1.15)' },
          '75%': { opacity: '0.9', transform: 'scale(1.05)' },
          '100%': { opacity: '0.8', transform: 'scale(1)' },
        },
        goEffect: {
          '0%': { opacity: '0', transform: 'scale(0.5) rotate(-15deg)' },
          '60%': { opacity: '1', transform: 'scale(1.3) rotate(5deg)' },
          '100%': { opacity: '0', transform: 'scale(1.8) rotate(0deg)' },
        },
        correctFlash: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(0, 255, 255, 0)' },
          '50%': { boxShadow: '0 0 25px 8px rgba(0, 255, 255, 0.7)' },
        },
        skipFlash: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(245, 158, 11, 0)' },
          '50%': { boxShadow: '0 0 20px 5px rgba(245, 158, 11, 0.7)' },
        },
        buttonHoverGlow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 255, 0.3)' },
          '100%': { boxShadow: '0 0 15px 5px rgba(0, 255, 255, 0.7)' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        floatUpFadeOut: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '1' },
          '50%': { transform: 'translateY(-30px) scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'translateY(-60px) scale(0.9)', opacity: '0' },
        },
        floatUpAndAway: {
          '0%': { transform: 'translateY(0) scale(1.0) rotate(0deg)', opacity: '1' },
          '30%': { transform: 'translate(20px, -40px) scale(2.6) rotate(-15deg)', opacity: '1' },
          '100%': { transform: 'translate(50px, -130px) scale(1.4) rotate(10deg)', opacity: '0' },
        },
        teamAPulse: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(56, 189, 248, 0.4), inset 0 0 4px rgba(56, 189, 248, 0.2)', borderColor: 'rgba(56, 189, 248, 0.7)' },
          '50%': { boxShadow: '0 0 20px 5px rgba(56, 189, 248, 0.8), inset 0 0 8px rgba(56, 189, 248, 0.4)', borderColor: 'rgba(56, 189, 248, 1)' },
        },
        teamBPulse: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(251, 146, 60, 0.4), inset 0 0 4px rgba(251, 146, 60, 0.2)', borderColor: 'rgba(251, 146, 60, 0.7)' },
          '50%': { boxShadow: '0 0 20px 5px rgba(251, 146, 60, 0.8), inset 0 0 8px rgba(251, 146, 60, 0.4)', borderColor: 'rgba(251, 146, 60, 1)' },
        },
        rgbBorderAnimation: { // Ensured inset shadow consistent with other glow effects
          '0%, 100%': { borderColor: '#FF4136', boxShadow: '0 0 12px 2px #FF4136, inset 0 0 6px 1px #FF4136' },
          '16%': { borderColor: '#FF851B', boxShadow: '0 0 12px 2px #FF851B, inset 0 0 6px 1px #FF851B' },
          '33%': { borderColor: '#FFDC00', boxShadow: '0 0 12px 2px #FFDC00, inset 0 0 6px 1px #FFDC00' },
          '50%': { borderColor: '#39FF14', boxShadow: '0 0 12px 2px #39FF14, inset 0 0 6px 1px #39FF14' },
          '66%': { borderColor: '#00FFFF', boxShadow: '0 0 12px 2px #00FFFF, inset 0 0 6px 1px #00FFFF' },
          '83%': { borderColor: '#5E2ABF', boxShadow: '0 0 12px 2px #5E2ABF, inset 0 0 6px 1px #5E2ABF' },
        },
        catHappyJump: {
          '0%': { transform: 'translateY(10px) scale(0.5) rotate(0deg)', opacity: '0' },
          '60%': { transform: 'translateY(-10px) scale(1.1) rotate(-5deg)', opacity: '1' },
          '80%': { transform: 'translateY(0px) scale(1) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'translateY(10px) scale(0.5) rotate(0deg)', opacity: '0' },
        },
        catSadAppear: {
          '0%': { transform: 'translateY(10px) scale(0.5) rotate(10deg)', opacity: '0' },
          '50%': { transform: 'translateY(0) scale(1) rotate(-5deg)', opacity: '1' },
          '70%': { transform: 'translateY(0) scale(1) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'translateY(10px) scale(0.5) rotate(0deg)', opacity: '0' },
        },
        starPop: {
          '0%': { transform: 'scale(0.5) translateY(0px)', opacity: '0.5' },
          '50%': { transform: 'scale(1.5) translateY(-15px)', opacity: '1' },
          '100%': { transform: 'scale(0.5) translateY(-30px)', opacity: '0' },
        },
        flash: { // General purpose flash using opacity
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        comboActivatePop: {
          '0%': { opacity: '0', transform: 'scale(0.7) translateY(10px)' },
          '50%': { opacity: '1', transform: 'scale(1.1) translateY(-5px)' },
          '80%': { opacity: '1', transform: 'scale(1) translateY(0px)' },
          '100%': { opacity: '0', transform: 'scale(0.9) translateY(5px)' },
        },
        timeBonusFloatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' },
          '20%': { opacity: '1', transform: 'translateY(0px) scale(1.1)' },
          '80%': { opacity: '1', transform: 'translateY(-10px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(0.8)' },
        },
        powerUpAppear: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(15px)' },
          '50%': { opacity: '1', transform: 'scale(1.05) translateY(-3px)' },
          '80%': { opacity: '1', transform: 'scale(1) translateY(0px)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
        },
        timerFreezeEffect: {
          '0%': { color: '#00FFFF', transform: 'scale(1)' },
          '50%': { color: '#39FF14', transform: 'scale(1.1)' },
          '100%': { color: '#00FFFF', transform: 'scale(1)' },
        },
        frostyPulse: {
          '0%, 100%': { boxShadow: '0 0 10px 3px rgba(0, 220, 255, 0.4), inset 0 0 8px rgba(220, 240, 255, 0.5)', borderColor: 'rgba(200, 240, 255, 0.8)' },
          '50%': { boxShadow: '0 0 15px 5px rgba(0, 255, 255, 0.6), inset 0 0 12px rgba(230, 250, 255, 0.7)', borderColor: 'rgba(220, 250, 255, 1)' },
        },
        wordCorrectEffect: {
          '0%': { transform: 'scale(1) translateY(0)', color: 'inherit', opacity: '1', textShadow: 'none' },
          '50%': { transform: 'scale(1.25) translateY(-5px)', color: '#39FF14', opacity: '1', textShadow: '0 0 10px #39FF14, 0 0 20px #39FF14' },
          '100%': { transform: 'scale(1) translateY(0)', color: 'inherit', opacity: '1', textShadow: 'none' },
        },
        wordSkipEffect: {
          '0%': { transform: 'translateX(0) rotate(0)', opacity: '1', color: 'inherit' },
          '15%': { transform: 'translateX(-4px) rotate(-2deg)', color: '#FF4136' },
          '30%': { transform: 'translateX(4px) rotate(2deg)', color: '#FF4136' },
          '45%': { transform: 'translateX(-4px) rotate(-1deg)', color: '#FF4136' },
          '60%': { transform: 'translateX(4px) rotate(1deg)', color: '#FF4136' },
          '75%': { transform: 'scale(0.95)', opacity: '0.7', color: '#FF4136' },
          '100%': { transform: 'scale(0.8) translateY(10px)', opacity: '0', color: '#FF4136' },
        },
        stampEffect: {
          '0%': { opacity: '0', transform: 'scale(0.5) rotate(-15deg) translateY(20px)' },
          '60%': { opacity: '1', transform: 'scale(1.1) rotate(5deg) translateY(-5px)' },
          '80%': { opacity: '1', transform: 'scale(1) rotate(0deg) translateY(0px)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg) translateY(0px)' },
        },
        rushHourGlowKeyframes: {
          '0%, 100%': {
            boxShadow: '0 0 12px 3px rgba(255, 65, 54, 0.6), inset 0 0 6px rgba(255, 65, 54, 0.4)'
          },
          '50%': {
            boxShadow: '0 0 30px 8px rgba(255, 0, 0, 1), inset 0 0 18px rgba(255, 0, 0, 0.8)'
          },
        },
        rushHourBounce: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4px) scale(1.02)' },
        },
        fastRushTextGlow: {
          '0%, 100%': { opacity: '1', textShadow: '0 0 20px #FF0000, 0 0 30px #FF4136, 0 0 40px #FF4136' },
          '50%': { opacity: '0.6', textShadow: '0 0 10px #FF0000, 0 0 15px #FF4136, 0 0 20px #FF4136' },
        },
        goldPulseGlow: {
          '0%, 100%': { color: '#FFDC00', textShadow: '0 0 5px #FFDC00, 0 0 10px #FFDC00' },
          '50%': { color: '#FFF352', textShadow: '0 0 10px #FFDC00, 0 0 20px #FFDC00, 0 0 30px #FFDC00' },
        },
        hellTimebarGlow: {
          '0%, 100%': { borderColor: 'rgba(0, 255, 255, 0.8)', boxShadow: '0 0 6px 1px rgba(0, 255, 255, 0.5), inset 0 0 4px rgba(0, 255, 255, 0.4)' },
          '50%': { borderColor: 'rgba(0, 255, 255, 1)', boxShadow: '0 0 14px 3px rgba(0, 255, 255, 0.7), inset 0 0 8px rgba(0, 255, 255, 0.6)' },
        },
        timeDepletedSpark: {
          '0%': { opacity: '1', transform: 'translate(-50%, -50%) scale(0.5)', filter: 'blur(2px)' },
          '50%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1.5)', filter: 'blur(0px)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0)', filter: 'blur(5px)' }
        },
        // waterBorderFlowAnim defined in index.html <style> tag
      },
    },
  },
  plugins: [],
};
