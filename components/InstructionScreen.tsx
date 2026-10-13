import React from 'react';
import { GameMode } from '../types';

interface InstructionScreenProps {
  gameMode: GameMode;
  onStartPlaying: () => void;
  onGoBackToSetup: () => void;
}

const NormalModeInstructions: React.FC = () => (
  <>
    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-neon-green mb-3 tracking-wide instruction-screen-title">
      🚀 NORMAL MODE: YOUR MISSION 🚀
    </h2>
    <div className="w-full space-y-3 text-left text-xs sm:text-sm leading-relaxed max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto pr-1 sm:pr-2 instruction-screen-content">
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/50 border border-electric-blue/30 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-1.5 font-heading">🎯 The Goal</h3>
        <p className="text-muted-text">One player describes the word on screen—no gestures, spelling, or 'sounds like' clues! The other player guesses. Score as many points as you can before time runs out!</p>
      </section>
      
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/70 border border-electric-blue/30 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-1.5 font-heading">🎮 How to Play</h3>
        <ul className="list-disc list-inside space-y-1 pl-2 text-muted-text">
          <li><strong className="text-neon-green">✔️ CORRECT:</strong> If your partner guesses right, hit the CORRECT button or press the <strong className="text-light-text">Left Arrow ⬅️</strong>.</li>
          <li><strong className="text-warning-yellow">✖️ SKIP:</strong> To pass a tricky word, hit the SKIP button or press the <strong className="text-light-text">Right Arrow ➡️</strong>.</li>
          <li><strong className="text-light-text">⏰ TIMER:</strong> Keep an eye on the clock! The game ends when it hits zero.</li>
        </ul>
      </section>

      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/50 border border-electric-blue/30 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-1.5 font-heading">� Peek-Proof Word Card</h3>
        <p className="text-muted-text">To stop guessers peeking via reflections, each word only stays visible for <strong className="text-light-text">4 seconds</strong>, then it hides. Hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal it again, and release to hide.</p>
      </section>

      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/50 border border-electric-blue/30 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-1.5 font-heading">� Scoring & Bonuses</h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-text">
          <li><strong className="text-light-text">Standard Guess:</strong> +100 points.</li>
          <li><strong className="text-yellow-300">🌟 Lucky Word:</strong> Some words are special and grant a <strong className="text-light-text">3x points multiplier!</strong></li>
          <li><strong className="text-orange-400">🔥 Combo Streak:</strong> Get 3+ correct guesses in a row for a <strong className="text-light-text">+50 point COMBO BONUS</strong> per word. A 5-streak gives a one-time <strong className="text-light-text">+5 SECONDS</strong> boost!</li>
          <li><strong className="text-light-text">⏱️ Time Bonus:</strong> Any time left on the clock adds to your final score!</li>
        </ul>
      </section>

      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/70 border border-electric-blue/30 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-1.5 font-heading">✨ Power-Ups</h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-text">
          <li><strong className="text-cyan-400">❄️ Time Freeze:</strong> A <strong className="text-light-text">10-correct streak</strong> adds <strong className="text-light-text">+5 seconds</strong> and briefly freezes the timer!</li>
          <li><strong className="text-yellow-400">↪️ Skip Freebie:</strong> Hit <strong className="text-light-text">streak milestones (5, 15, etc.)</strong> to earn a free skip that won't break your combo.</li>
          <li><strong className="text-purple-400">💎 RUSH HOUR:</strong> Reach <strong className="text-light-text">score milestones (2000, 4000...)</strong> to trigger RUSH HOUR! For 30 seconds, the timer speeds up, but correct answers give <strong className="text-light-text">DOUBLE POINTS!</strong></li>
        </ul>
      </section>
    </div>
  </>
);

const HellModeInstructions: React.FC = () => (
  <>
    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-danger-red mb-3 tracking-wide animate-pulseOnce instruction-screen-title">
      🔥 HELL MODE: CAN YOU SURVIVE? 🔥
    </h2>
    <div className="w-full space-y-3 text-left text-xs sm:text-sm leading-relaxed max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto pr-1 sm:pr-2 instruction-screen-content">
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/50 border border-danger-red/50 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-1.5 font-heading">👹 The Challenge</h3>
        <p className="text-muted-text">This is the ultimate test of skill using your chosen word list. Your goal is to score as high as possible before the <strong className="text-light-text">TIME BAR</strong> at the top vanishes. There is no time bonus—only survival!</p>
      </section>
      
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/70 border border-danger-red/50 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-1.5 font-heading">💔 Skips Are Costly</h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-text">
          <li>You start with <strong className="text-light-text">ONLY 3 SKIPS</strong>, shown as ❤️ hearts. When they're gone, the skip button is disabled.</li>
          <li><strong className="text-warning-yellow">Standard Skip Penalty:</strong> <strong className="text-danger-red">-200 points.</strong></li>
          <li><strong className="text-warning-yellow">🌟 Lucky Word Skip Penalty:</strong> <strong className="text-danger-red">-500 points!</strong></li>
           <li><strong className="text-yellow-400">↪️ Skip Freebies</strong> (earned via streaks) <strong className="text-light-text">DO NOT</strong> use a ❤️ or deduct points.</li>
        </ul>
      </section>
      
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/70 border border-danger-red/50 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-1.5 font-heading">🙈 Peek-Proof Word Card</h3>
        <p className="text-muted-text">Words auto-hide after <strong className="text-light-text">4 seconds</strong>. Hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal the word again—release to hide it.</p>
      </section>
      
      <section className="p-2 sm:p-3 rounded-lg bg-dark-metal/50 border border-danger-red/50 shadow-md">
        <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-1.5 font-heading">⏳ The Clock is Your Enemy</h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-text">
          <li><strong className="text-purple-400">💎 RUSH HOUR:</strong> This triggers <strong className="text-light-text">twice per game</strong> as time passes.</li>
          <li>During Rush Hour, the time bar depletes <strong className="text-light-text">TWICE AS FAST</strong>, but correct answers earn <strong className="text-light-text">DOUBLE POINTS!</strong></li>
        </ul>
      </section>
      <p className="text-center text-md sm:text-lg text-warning-yellow font-bold">Good luck... you'll need it. 😈</p>
    </div>
  </>
);

const TeamModeInstructions: React.FC = () => (
  <>
    <h2 className="text-3xl sm:text-4xl font-heading font-bold text-cyan-300 mb-4 tracking-wide instruction-screen-title">
      🤝 TEAM BATTLE: RULES OF ENGAGEMENT 🤝
    </h2>
    <div className="w-full space-y-4 text-left text-sm sm:text-base leading-relaxed max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-320px)] overflow-y-auto pr-2 sm:pr-3 instruction-screen-content">
      <section className="p-3 sm:p-4 rounded-lg bg-dark-metal/50 border border-cyan-300/30 shadow-md">
        <h3 className="text-xl sm:text-2xl font-semibold text-cyan-300 mb-2 font-heading">🎯 The Goal</h3>
        <p className="text-muted-text">Two teams take turns guessing words. After one team answers, the turn <strong className="text-light-text">immediately passes to the other team</strong>. The team with the highest score when time runs out wins!</p>
      </section>
      
      <section className="p-3 sm:p-4 rounded-lg bg-dark-metal/70 border border-cyan-300/30 shadow-md">
        <h3 className="text-xl sm:text-2xl font-semibold text-cyan-300 mb-2 font-heading">� Peek-Proof Word Card</h3>
        <p className="text-muted-text">The active word auto-hides after <strong className="text-light-text">4 seconds</strong>. The describer can hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal it again, and releases to hide it—so guessers can't cheat via screen reflections.</p>
      </section>
      
      <section className="p-3 sm:p-4 rounded-lg bg-dark-metal/70 border border-cyan-300/30 shadow-md">
        <h3 className="text-xl sm:text-2xl font-semibold text-cyan-300 mb-2 font-heading">�💰 Scoring</h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-text">
          <li><strong className="text-neon-green">Correct Guess:</strong> +100 points.</li>
          <li><strong className="text-danger-red">Skip Word:</strong> -30 points.</li>
          <li><strong className="text-yellow-300">⚡ Speed Bonus:</strong>
            <ul className="list-['-_'] list-inside pl-4 sm:pl-5 space-y-1 mt-1">
                <li>Guess under 5 seconds for a <strong className="text-light-text">+50 point bonus!</strong></li>
                <li>Guess in 5-10 seconds for a <strong className="text-light-text">+20 point bonus.</strong></li>
            </ul>
          </li>
          <li><strong className="text-muted-text italic">Note: No combo bonuses or lucky words in this mode!</strong></li>
        </ul>
      </section>

      <section className="p-3 sm:p-4 rounded-lg bg-dark-metal/50 border border-cyan-300/30 shadow-md">
        <h3 className="text-xl sm:text-2xl font-semibold text-cyan-300 mb-2 font-heading">🎁 Surprise Boxes!</h3>
        <p className="text-muted-text">When your team's score hits a <strong className="text-light-text">milestone (500, 1000, 1500...)</strong>, the game pauses and you get to pick one of three mystery boxes. They can contain powerful buffs or disruptive debuffs that could change the game entirely!</p>
      </section>
    </div>
  </>
);


export const InstructionScreen: React.FC<InstructionScreenProps> = ({ gameMode, onStartPlaying, onGoBackToSetup }) => {
  const renderInstructions = () => {
    switch(gameMode) {
      case GameMode.TEAM:
        return <TeamModeInstructions />;
      case GameMode.HELL:
        return <HellModeInstructions />;
      case GameMode.NORMAL:
      default:
        return <NormalModeInstructions />;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 text-light-text animate-fadeInScaleUp h-full">
      {renderInstructions()}
      <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto pt-3 instruction-buttons">
        <button
          type="button"
          onClick={onGoBackToSetup}
          className="w-full sm:w-auto flex-grow futuristic-button bg-cyber-purple/60 hover:bg-cyber-purple/80 border border-cyber-purple/80 text-light-text/90 font-semibold py-2.5 sm:py-3 px-6 rounded-lg shadow text-sm sm:text-md"
          aria-label="Go back to game setup"
        >
          Back to Setup
        </button>
        <button
          type="button"
          onClick={onStartPlaying}
          className={`w-full sm:w-auto flex-grow text-dark-metal font-bold py-2.5 sm:py-3 px-8 rounded-lg shadow-md hover:shadow-lg futuristic-button text-md sm:text-lg
            ${gameMode === GameMode.HELL 
              ? 'bg-gradient-to-r from-danger-red to-orange-500 hover:from-orange-500 hover:to-warning-yellow' 
              : gameMode === GameMode.TEAM
              ? 'bg-gradient-to-r from-cyan-400 to-electric-blue hover:from-electric-blue hover:to-cyan-300'
              : 'bg-gradient-to-r from-neon-green to-green-500 hover:from-green-400 hover:to-neon-green'}`}
          aria-label="Start playing the game"
        >
          {
            gameMode === GameMode.HELL ? "Enter Hell!" 
            : gameMode === GameMode.TEAM ? "Start Battle!"
            : "Let's Play!"
          }
        </button>
      </div>
    </div>
  );
};