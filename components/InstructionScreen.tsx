import React, { useState } from 'react';
import { GameMode } from '../types';

interface InstructionScreenProps {
  gameMode: GameMode;
  onStartPlaying: () => void;
  onGoBackToSetup: () => void;
}

// Every mode's rules are read as paged sections (like the setup wizard) instead of one long
// scroll. The panel takes the remaining height and scrolls internally, so the footer buttons
// stay pinned in place whichever section is on screen.
const SECTION_SCROLL_CLASS =
  'w-full flex-1 min-h-0 animate-fadeInScaleUp text-left text-xs leading-[1.85] sm:text-sm overflow-y-auto px-1 py-1 sm:px-2 instruction-screen-content';

interface SectionPagerProps {
  labels: readonly string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Classes for the active pill (mode accent colour). */
  activePillClassName: string;
  /** Accent text colour shared by the idle pills and both arrows. */
  accentTextClassName: string;
}

const SectionPager: React.FC<SectionPagerProps> = ({
  labels,
  activeIndex,
  onSelect,
  activePillClassName,
  accentTextClassName,
}) => {
  const arrowClassName = `futuristic-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] ${accentTextClassName} hover:bg-cyber-purple/30 disabled:opacity-30`;

  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label="Instruction sections">
      <button
        type="button"
        onClick={() => onSelect(activeIndex - 1)}
        disabled={activeIndex === 0}
        className={arrowClassName}
        aria-label="Previous section"
      >
        ◂
      </button>
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={activeIndex === index}
          onClick={() => onSelect(index)}
          className={`futuristic-button rounded-full px-3 py-1.5 text-[0.7rem] font-semibold sm:text-xs ${
            activeIndex === index ? activePillClassName : `bg-[var(--surface-1)] ${accentTextClassName} hover:bg-cyber-purple/30`
          }`}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect(activeIndex + 1)}
        disabled={activeIndex === labels.length - 1}
        className={arrowClassName}
        aria-label="Next section"
      >
        ▸
      </button>
    </div>
  );
};

const NormalModeInstructions: React.FC = () => {
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-neon-green tracking-wide instruction-screen-title">
        🚀 NORMAL MODE: YOUR MISSION 🚀
      </h2>

      <SectionPager
        labels={['Gameplay', 'Scoring']}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-electric-blue text-dark-metal"
        accentTextClassName="text-electric-blue"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">🎯 The Goal</h3>
            <p className="text-muted-text">One player describes the word on screen—no gestures, spelling, or 'sounds like' clues. The crew guesses as many as they can before time runs out!</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">🎮 How to Play</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-neon-green">✔️ CORRECT:</strong> They got it right — hit CORRECT or press <strong className="text-light-text">⬅️ Left Arrow</strong>.</li>
              <li><strong className="text-warning-yellow">✖️ SKIP:</strong> Stuck on a word? Hit SKIP or press <strong className="text-light-text">➡️ Right Arrow</strong>.</li>
              <li><strong className="text-light-text">⏰ TIMER:</strong> Watch the clock — the game ends at zero.</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">🙈 Peek-Proof Word Card</h3>
            <p className="text-muted-text">Each word stays visible for <strong className="text-light-text">4 seconds</strong>, then hides. Hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal it again — release to hide.</p>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">💰 Scoring &amp; Bonuses</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-light-text">Standard Guess:</strong> +100 points.</li>
              <li><strong className="text-warning-yellow">🌟 Lucky Word:</strong> Some words are special and grant a <strong className="text-light-text">3x points multiplier!</strong></li>
              <li><strong className="text-danger-red">🔥 Combo Streak:</strong> 3+ correct in a row earns <strong className="text-light-text">+50 per word</strong>; a 5-streak adds <strong className="text-light-text">+5 seconds</strong>!</li>
              <li><strong className="text-light-text">⏱️ Time Bonus:</strong> Any time left on the clock adds to your final score!</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">✨ Power-Ups</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-electric-blue">❄️ Time Freeze:</strong> A <strong className="text-light-text">10-correct streak</strong> adds <strong className="text-light-text">+5 seconds</strong> and freezes the timer!</li>
              <li><strong className="text-warning-yellow">↪️ Skip Freebie:</strong> Hit <strong className="text-light-text">streak milestones (5, 15...)</strong> for a free skip that keeps your combo alive.</li>
              <li><strong className="text-cyber-purple">💎 RUSH HOUR:</strong> Reach <strong className="text-light-text">score milestones (2000, 4000...)</strong> for 30s of double speed — correct answers score <strong className="text-light-text">DOUBLE POINTS!</strong></li>
            </ul>
          </section>
        )}
      </div>
    </>
  );
};

const HellModeInstructions: React.FC = () => {
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-danger-red tracking-wide animate-pulseOnce instruction-screen-title">
        🔥 HELL MODE: CAN YOU SURVIVE? 🔥
      </h2>

      <SectionPager
        labels={['Gameplay', 'Penalties']}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-danger-red text-dark-metal"
        accentTextClassName="text-danger-red"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-danger-red/50 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 font-heading">👹 The Challenge</h3>
            <p className="text-muted-text">This is the ultimate test of skill using your chosen word list. Score as high as possible before the <strong className="text-light-text">TIME BAR</strong> at the top vanishes. There is no time bonus — only survival!</p>

            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 mt-4 font-heading">🙈 Peek-Proof Word Card</h3>
            <p className="text-muted-text">Words auto-hide after <strong className="text-light-text">4 seconds</strong>. Hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal the word again — release to hide it.</p>

            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 mt-4 font-heading">⏳ The Clock is Your Enemy</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-cyber-purple">💎 RUSH HOUR:</strong> This triggers <strong className="text-light-text">twice per game</strong> as time passes.</li>
              <li>During Rush Hour, the time bar depletes <strong className="text-light-text">TWICE AS FAST</strong>, but correct answers earn <strong className="text-light-text">DOUBLE POINTS!</strong></li>
            </ul>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-danger-red/50 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 font-heading">💔 Skips Are Costly</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li>You start with <strong className="text-light-text">ONLY 3 SKIPS</strong>, shown as ❤️ hearts. When they're gone, the skip button is disabled.</li>
              <li><strong className="text-warning-yellow">Standard Skip Penalty:</strong> <strong className="text-danger-red">-200 points.</strong></li>
              <li><strong className="text-warning-yellow">🌟 Lucky Word Skip Penalty:</strong> <strong className="text-danger-red">-500 points!</strong></li>
              <li><strong className="text-neon-green">Score Floor:</strong> a penalty never pushes your score below <strong className="text-light-text">0</strong>.</li>
              <li><strong className="text-warning-yellow">↪️ Skip Freebies</strong> (earned via streaks) <strong className="text-light-text">DO NOT</strong> use a ❤️ or deduct points.</li>
            </ul>
            <p className="mt-4 text-center text-sm sm:text-base text-warning-yellow font-bold">Good luck... you'll need it. 😈</p>
          </section>
        )}
      </div>
    </>
  );
};

const TeamModeInstructions: React.FC = () => {
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-electric-blue tracking-wide instruction-screen-title">
        🤝 TEAM MODE: RULES 🤝
      </h2>

      <SectionPager
        labels={['Gameplay', 'Scoring']}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-electric-blue text-dark-metal"
        accentTextClassName="text-electric-blue"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">🎯 The Goal</h3>
            <p className="text-muted-text">Two teams take turns guessing words. After one team answers, the turn <strong className="text-light-text">immediately passes to the other team</strong>. Play continues until <strong className="text-light-text">every word in the list has been used</strong> — the highest score then wins!</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">🙈 Peek-Proof Word Card</h3>
            <p className="text-muted-text">The active word auto-hides after <strong className="text-light-text">4 seconds</strong>. Hold <strong className="text-light-text">SPACE</strong> (or press and hold the card) to reveal it again — release to hide it, so guessers can't cheat via screen reflections.</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">🎁 Surprise Boxes!</h3>
            <p className="text-muted-text">When your team's score hits a <strong className="text-light-text">milestone (500, 1000, 1500...)</strong>, the game pauses and you pick one of three mystery boxes. They can hold powerful buffs or disruptive debuffs that could change the game entirely!</p>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">💰 Scoring</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-neon-green">Correct Guess:</strong> +100 points.</li>
              <li><strong className="text-danger-red">Skip Word:</strong> -30 points (never below 0).</li>
              <li><strong className="text-warning-yellow">⚡ Speed Bonus:</strong>
                <ul className="list-['-_'] list-inside space-y-1.5 pl-4 mt-1">
                  <li>Guess under 5 seconds for a <strong className="text-light-text">+50 point bonus!</strong></li>
                  <li>Guess in 5-10 seconds for a <strong className="text-light-text">+20 point bonus.</strong></li>
                </ul>
              </li>
              <li><strong className="text-muted-text italic">Note: No combo bonuses or lucky words in this mode!</strong></li>
            </ul>
          </section>
        )}
      </div>
    </>
  );
};

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
    <div className="flex h-full min-h-0 flex-col items-center space-y-3 text-light-text animate-fadeInScaleUp">
      {renderInstructions()}
      <div className="w-full shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 instruction-buttons">
        <button
          type="button"
          onClick={onGoBackToSetup}
          className="w-full sm:w-auto flex-grow futuristic-button bg-cyber-purple/60 hover:bg-cyber-purple/80 border border-cyber-purple/80 text-light-text/90 font-semibold py-2.5 sm:py-3 px-6 rounded-[var(--r-md)] min-h-[44px] text-sm sm:text-base"
          aria-label="Go back to game setup"
        >
          Back to Setup
        </button>
        <button
          type="button"
          onClick={onStartPlaying}
          className={`w-full sm:w-auto flex-grow text-dark-metal font-bold py-2.5 sm:py-3 px-8 rounded-[var(--r-md)] min-h-[44px] futuristic-button text-base sm:text-lg
            ${gameMode === GameMode.HELL 
              ? 'bg-danger-red hover:bg-red-400' 
              : gameMode === GameMode.TEAM
              ? 'bg-electric-blue hover:bg-sky-400'
              : 'bg-neon-green hover:bg-emerald-400'}`}
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
