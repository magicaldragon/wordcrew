import React, { useCallback, useState, useEffect, useRef } from 'react';
import { GameMode } from '../types'; // Import GameMode
import { UnlockDialog } from './UnlockDialog';
import type { UnlockOutcome } from '../services/payments';

interface ResultsScreenProps {
  baseScore?: number;
  timeBonus?: number;
  finalScore?: number;
  teamAScore?: number;
  teamBScore?: number;
  onHome: () => void;
  gameMode: GameMode;
  isUnlocked: boolean;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
  demoRounds?: number;
}

const complimentTiers = {
  tier0: { // 0 or less
    emoji: "😔",
    messages: [
      "No words guessed correctly. Better luck next time!",
      "A fresh start awaits! Try again?",
      "Every expert was once a beginner. Keep going!",
      "Zero points? The only way is up!",
      "Don't worry, even a blank slate can become a masterpiece!",
    ],
  },
  tier1: { // 1 - 499
    emoji: "👍",
    messages: [
      "Good start! Keep practicing!",
      "You're just getting warmed up!",
      "A promising beginning! More rounds?",
      "Nice first steps into the game!",
      "Keep at it, you're building momentum!",
    ],
  },
  tier2: { // 500 - 999
    emoji: "😊",
    messages: [
      "Nice job! You're getting good at this.",
      "Solid effort! You're improving!",
      "That was a good round. Keep it up!",
      "You're definitely on the right track!",
      "Getting the hang of it, I see!",
    ],
  },
  tier3: { // 1000 - 1999
    emoji: "🎉",
    messages: [
      "Great score! You're a fantastic guesser!",
      "Impressive! You've got some skills!",
      "Wow, over 1000 points! Well done!",
      "That's a solid performance!",
      "You're making this look easy!",
    ],
  },
  tier4: { // 2000 - 3499
    emoji: "🚀",
    messages: [
      "Amazing work! You've got serious skills!",
      "Over 2000! You're soaring!",
      "That's some top-tier guessing!",
      "Truly fantastic! Keep this energy!",
      "You're a natural at this game!",
    ],
  },
  tier5: { // 3500 - 4999
    emoji: "🔥",
    messages: [
      "Outstanding! You're on fire!",
      "Phenomenal score! Absolutely crushing it!",
      "You're blazing through these words!",
      "Remarkable! That was a masterclass!",
      "Is it hot in here, or is it just your score?",
    ],
  },
  tier6: { // 5000 - 6999
    emoji: "🏆✨",
    messages: [
      "Incredible! You're a WordCrew champion!",
      "Legendary status almost unlocked!",
      "Masterful performance! Truly top-tier!",
      "That score is breathtaking! Well played!",
      "You're in a league of your own!",
    ],
  },
  tier7: { // 7000+
    emoji: "🌟👑",
    messages: [
      "WordCrew GOD! Simply unmatched!",
      "UNBELIEVABLE! You've conquered the game!",
      "Perfection! A score for the history books!",
      "Is there anything you can't guess? True legend!",
      "You didn't just play, you DOMINATED!",
    ],
  },
};

const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

const getComplimentForScore = (score: number) => {
  let tier;
  if (score <= 0) tier = complimentTiers.tier0;
  else if (score < 500) tier = complimentTiers.tier1;
  else if (score < 1000) tier = complimentTiers.tier2;
  else if (score < 2000) tier = complimentTiers.tier3;
  else if (score < 3500) tier = complimentTiers.tier4;
  else if (score < 5000) tier = complimentTiers.tier5;
  else if (score < 7000) tier = complimentTiers.tier6;
  else tier = complimentTiers.tier7;
  return { message: getRandomMessage(tier.messages), emoji: tier.emoji };
};

const SinglePlayerResults: React.FC<Required<Pick<ResultsScreenProps, 'baseScore' | 'timeBonus' | 'finalScore'>>> = ({ baseScore, timeBonus, finalScore }) => {
  const [displayedScore, setDisplayedScore] = useState(baseScore);
  const [showTimeBonusText, setShowTimeBonusText] = useState(false);
  const [scoreAnimationKey, setScoreAnimationKey] = useState(0); 
  const animationFrameIdRef = useRef<number | null>(null);
  const [compliment, setCompliment] = useState({ message: "", emoji: "🤔" });

  useEffect(() => {
    setDisplayedScore(baseScore); 
    setShowTimeBonusText(false);
    
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    setCompliment(getComplimentForScore(finalScore));

    if (timeBonus > 0) {
      setScoreAnimationKey(0); 
      const timer1 = setTimeout(() => {
        setShowTimeBonusText(true); 
      }, 700); 

      const timer2 = setTimeout(() => {
        const startScore = baseScore; 
        const endScore = finalScore;  
        const countUpDuration = 1000; 
        const startTime = Date.now();

        const animateScore = () => {
          const elapsedTime = Date.now() - startTime;
          
          if (elapsedTime >= countUpDuration) {
            setDisplayedScore(endScore);
            setScoreAnimationKey(key => key + 1); 
            animationFrameIdRef.current = null;
            return;
          }
          
          const progress = elapsedTime / countUpDuration;
          const currentAnimatedScore = startScore + Math.round((endScore - startScore) * progress);
          setDisplayedScore(currentAnimatedScore);
          
          animationFrameIdRef.current = requestAnimationFrame(animateScore);
        };
        animationFrameIdRef.current = requestAnimationFrame(animateScore);
      }, 1000); 

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      };
    } else {
      setDisplayedScore(finalScore); 
      setScoreAnimationKey(key => key + 1); 
    }
  }, [baseScore, timeBonus, finalScore]);

  return (
    <>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-electric-blue results-screen-title">Game Over! <span role="img" aria-label="result emoji">{compliment.emoji}</span></h2>
      <div className="text-center w-full">
        <p className="text-xl sm:text-2xl text-muted-text score-breakdown">Your Score:</p>
        <p 
          key={scoreAnimationKey} 
          className={`text-6xl sm:text-7xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-electric-blue to-cyber-purple my-2 sm:my-3 final-score ${scoreAnimationKey > 0 ? 'animate-pulseOnce' : ''}`}
        >
          {displayedScore}
        </p>

        {showTimeBonusText && timeBonus > 0 && (
          <p className="text-lg sm:text-xl text-neon-green animate-fadeInScaleUp score-breakdown">
            Time Bonus: +{timeBonus}
          </p>
        )}
        
        <p className="text-xl sm:text-2xl text-warning-yellow font-semibold px-2 sm:px-4 mt-3 sm:mt-4 animate-goldPulseGlow compliment-message">{compliment.message}</p>
      </div>
    </>
  );
};


const TeamResults: React.FC<Required<Pick<ResultsScreenProps, 'teamAScore' | 'teamBScore'>>> = ({ teamAScore, teamBScore }) => {
  const winner = teamAScore > teamBScore ? 'Team A' : (teamBScore > teamAScore ? 'Team B' : 'Draw');
  const winningScore = Math.max(teamAScore, teamBScore);
  const compliment = getComplimentForScore(winner === 'Draw' ? (teamAScore + teamBScore) / 2 : winningScore);

  const getWinnerText = () => {
    if (winner === 'Draw') {
      return "It's a Draw! 🤝";
    }
    return `${winner} Wins! ${compliment.emoji}`;
  };

  return (
    <>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-electric-blue results-screen-title">
        {getWinnerText()}
      </h2>
      <div className="w-full grid grid-cols-2 gap-4 my-2 sm:my-3 px-2 sm:px-4">
        <div className="text-center p-2 rounded-lg border-2 border-cyan-400/50 bg-cyan-400/10">
            <p className="text-lg sm:text-xl text-cyan-300 score-breakdown">Team A</p>
            <p className="text-4xl sm:text-5xl font-bold font-heading text-light-text animate-pulseOnce">
                {teamAScore}
            </p>
        </div>
        <div className="text-center p-2 rounded-lg border-2 border-orange-400/50 bg-orange-400/10">
            <p className="text-lg sm:text-xl text-orange-300 score-breakdown">Team B</p>
            <p className="text-4xl sm:text-5xl font-bold font-heading text-light-text animate-pulseOnce">
                {teamBScore}
            </p>
        </div>
      </div>
      <p className="text-xl sm:text-2xl text-warning-yellow font-semibold px-2 sm:px-4 mt-3 sm:mt-4 animate-goldPulseGlow compliment-message">
        {compliment.message}
      </p>
    </>
  );
};


export const ResultsScreen: React.FC<ResultsScreenProps> = ({ 
  baseScore,
  timeBonus,
  finalScore,
  teamAScore,
  teamBScore,
  onHome,
  gameMode,
  isUnlocked,
  onUnlock,
  demoRounds = 0,
}) => {

  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);

  const handleHomeClick = useCallback(() => {
    onHome();
  }, [onHome]);
  
  const resultCardClass = gameMode === GameMode.HELL 
    ? 'border-2 border-danger-red/70 shadow-danger-red/40'
    : gameMode === GameMode.TEAM
    ? 'border-2 border-cyan-400/70 shadow-cyan-400/30'
    : 'border-2 border-neon-green/70 shadow-neon-green/30';

  return (
    <div className={`flex flex-col items-center space-y-4 sm:space-y-5 text-light-text ${resultCardClass} p-3 sm:p-4 rounded-lg h-full justify-center`}>
      
      {gameMode === GameMode.TEAM && teamAScore !== undefined && teamBScore !== undefined ? (
        <TeamResults teamAScore={teamAScore} teamBScore={teamBScore} />
      ) : (
        <SinglePlayerResults baseScore={baseScore ?? 0} timeBonus={timeBonus ?? 0} finalScore={finalScore ?? 0} />
      )}

      <button
        type="button"
        onClick={handleHomeClick}
        className="bg-gradient-to-r from-cyber-purple to-electric-blue hover:from-electric-blue hover:to-neon-green text-dark-metal font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg shadow-md hover:shadow-lg futuristic-button text-md sm:text-lg mt-2 sm:mt-3 home-button"
        aria-label="Back to home"
      >
        Home
      </button>

      {/* Conversion touchpoint: offered at the emotional peak, right after the score.
          The pitch gets firmer from the second demo round onwards. */}
      {!isUnlocked && (
        <div className="w-full max-w-sm rounded-xl border border-warning-yellow/40 bg-warning-yellow/10 p-3 text-center animate-fadeInScaleUp">
          <p className="font-heading text-sm font-bold tracking-wide text-warning-yellow">
            {demoRounds >= 2
              ? `🔥 ${demoRounds} rounds — ready for more?`
              : '🔥 That was only the demo'}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-text">
            {demoRounds >= 2
              ? <>Hell 💀 and 5 more word packs are one code away.</>
              : <>Unlock <strong className="text-light-text">Hell 💀</strong> and{' '}
                  <strong className="text-light-text">5 more word packs</strong>.</>}
          </p>
          <button
            type="button"
            onClick={() => setShowUnlockDialog(true)}
            className="futuristic-button mt-2 w-full rounded-lg bg-gradient-to-r from-warning-yellow to-amber-500 px-4 py-2 font-bold text-dark-metal"
          >
            🔓 Unlock Full Version
          </button>
        </div>
      )}

      <UnlockDialog
        isOpen={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onUnlock={onUnlock}
      />
    </div>
  );
};