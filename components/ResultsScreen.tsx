import React, { useCallback, useState, useEffect, useRef } from 'react';
import { GameMode } from '../types'; // Import GameMode
import { UnlockDialog } from './UnlockDialog';
import { Icon } from './Icon';
import type { UnlockOutcome } from '../services/payments';
import { useT } from '../i18n/useT';
import { renderEmphasis } from '../i18n/renderEmphasis';

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

type ComplimentTier = { emoji: string; messages: readonly string[] };
type ComplimentTiers = Record<`tier${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`, ComplimentTier>;

const getRandomMessage = (messages: readonly string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

const getComplimentForScore = (score: number, tiers: ComplimentTiers) => {
  let tier;
  if (score <= 0) tier = tiers.tier0;
  else if (score < 500) tier = tiers.tier1;
  else if (score < 1000) tier = tiers.tier2;
  else if (score < 2000) tier = tiers.tier3;
  else if (score < 3500) tier = tiers.tier4;
  else if (score < 5000) tier = tiers.tier5;
  else if (score < 7000) tier = tiers.tier6;
  else tier = tiers.tier7;
  return { message: getRandomMessage(tier.messages), emoji: tier.emoji };
};

const SinglePlayerResults: React.FC<Required<Pick<ResultsScreenProps, 'baseScore' | 'timeBonus' | 'finalScore'>>> = ({ baseScore, timeBonus, finalScore }) => {
  const t = useT('game');
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

    setCompliment(getComplimentForScore(finalScore, t.results.compliments));

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
  }, [baseScore, timeBonus, finalScore, t.results.compliments]);

  return (
    <>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-electric-blue results-screen-title">{t.results.gameOver} <span role="img" aria-label={t.results.resultEmojiAria}>{compliment.emoji}</span></h2>
      <div className="text-center w-full">
        <p className="text-xl sm:text-2xl text-muted-text score-breakdown">{t.results.yourScore}</p>
        <p 
          key={scoreAnimationKey} 
          className={`text-6xl sm:text-7xl font-extrabold font-heading text-neon-green my-2 sm:my-3 final-score ${scoreAnimationKey > 0 ? 'animate-pulseOnce' : ''}`}
        >
          {displayedScore}
        </p>

        {showTimeBonusText && timeBonus > 0 && (
          <p className="text-lg sm:text-xl text-neon-green animate-fadeInScaleUp score-breakdown">
            {t.results.timeBonus(timeBonus)}
          </p>
        )}
        
        <p className="text-xl sm:text-2xl text-warning-yellow font-semibold px-2 sm:px-4 mt-3 sm:mt-4 animate-goldPulseGlow compliment-message">{compliment.message}</p>
      </div>
    </>
  );
};


const TeamResults: React.FC<Required<Pick<ResultsScreenProps, 'teamAScore' | 'teamBScore'>>> = ({ teamAScore, teamBScore }) => {
  const t = useT('game');
  const winner = teamAScore > teamBScore ? 'A' : (teamBScore > teamAScore ? 'B' : 'draw');
  const winningScore = Math.max(teamAScore, teamBScore);
  const compliment = getComplimentForScore(winner === 'draw' ? (teamAScore + teamBScore) / 2 : winningScore, t.results.compliments);

  const getWinnerText = () => {
    if (winner === 'draw') {
      return t.results.draw;
    }
    return t.results.win(winner === 'A' ? t.results.teamA : t.results.teamB, compliment.emoji);
  };

  return (
    <>
      <h2 className="text-3xl sm:text-4xl font-heading font-bold text-electric-blue results-screen-title">
        {getWinnerText()}
      </h2>
      <div className="w-full grid grid-cols-2 gap-4 my-2 sm:my-3 px-2 sm:px-4">
        <div className="text-center p-2 rounded-lg border-2 border-cyan-400/50 bg-cyan-400/10">
            <p className="text-lg sm:text-xl text-cyan-300 score-breakdown">{t.results.teamA}</p>
            <p className="text-4xl sm:text-5xl font-bold font-heading text-light-text animate-pulseOnce">
                {teamAScore}
            </p>
        </div>
        <div className="text-center p-2 rounded-lg border-2 border-orange-400/50 bg-orange-400/10">
            <p className="text-lg sm:text-xl text-orange-300 score-breakdown">{t.results.teamB}</p>
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

  const t = useT('game');
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);

  const handleHomeClick = useCallback(() => {
    onHome();
  }, [onHome]);
  
  const resultCardClass = gameMode === GameMode.HELL 
    ? 'border border-danger-red/60 shadow-[var(--elev-3)]'
    : gameMode === GameMode.TEAM
    ? 'border border-electric-blue/60 shadow-[var(--elev-3)]'
    : 'border border-neon-green/60 shadow-[var(--elev-3)]';

  return (
    <div className={`flex flex-col items-center space-y-4 sm:space-y-5 text-light-text ${resultCardClass} p-3 sm:p-4 rounded-[var(--r-lg)] h-full justify-center`}>
      
      {gameMode === GameMode.TEAM && teamAScore !== undefined && teamBScore !== undefined ? (
        <TeamResults teamAScore={teamAScore} teamBScore={teamBScore} />
      ) : (
        <SinglePlayerResults baseScore={baseScore ?? 0} timeBonus={timeBonus ?? 0} finalScore={finalScore ?? 0} />
      )}

      <button
        type="button"
        onClick={handleHomeClick}
        className="bg-neon-green hover:bg-emerald-400 text-dark-metal font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-[var(--r-md)] min-h-[44px] futuristic-button text-base sm:text-lg mt-2 sm:mt-3 home-button"
        aria-label={t.results.homeAria}
      >
        {t.results.home}
      </button>

      {/* Conversion touchpoint: offered at the emotional peak, right after the score.
          The pitch gets firmer from the second demo round onwards. */}
      {!isUnlocked && (
        <div className="w-full max-w-sm rounded-[var(--r-lg)] border border-warning-yellow/40 bg-warning-yellow/10 p-3 text-center animate-fadeInScaleUp">
          <p className="font-heading text-sm font-bold tracking-wide text-warning-yellow">
            {demoRounds >= 2
              ? t.results.demoRounds(demoRounds)
              : t.results.demoOnly}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-text">
            {demoRounds >= 2
              ? <>{t.results.demoPitchRounds}</>
              : <>{renderEmphasis(t.results.demoPitchUnlock)}</>}
          </p>
          <button
            type="button"
            onClick={() => setShowUnlockDialog(true)}
            className="futuristic-button mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[var(--r-md)] min-h-[44px] bg-warning-yellow px-4 py-2 font-bold text-dark-metal hover:bg-amber-400"
          >
            <Icon name="unlock" size={18} />
            {t.results.unlockCta}
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