import React, { useState } from 'react';
import { GameMode } from '../types';
import { useT } from '../i18n/useT';
import { renderEmphasis } from '../i18n/renderEmphasis';

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
  const t = useT('game');
  const arrowClassName = `futuristic-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)] ${accentTextClassName} hover:bg-cyber-purple/30 disabled:opacity-30`;

  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label={t.instructions.pager.sectionsAria}>
      <button
        type="button"
        onClick={() => onSelect(activeIndex - 1)}
        disabled={activeIndex === 0}
        className={arrowClassName}
        aria-label={t.instructions.pager.previous}
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
        aria-label={t.instructions.pager.next}
      >
        ▸
      </button>
    </div>
  );
};

const NormalModeInstructions: React.FC = () => {
  const t = useT('game');
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-neon-green tracking-wide instruction-screen-title">
        {t.instructions.normal.title}
      </h2>

      <SectionPager
        labels={[t.instructions.tabs.gameplay, t.instructions.tabs.scoring]}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-electric-blue text-dark-metal"
        accentTextClassName="text-electric-blue"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">{t.instructions.normal.goalTitle}</h3>
            <p className="text-muted-text">{t.instructions.normal.goalBody}</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">{t.instructions.normal.howTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-neon-green">{t.instructions.normal.correctLabel}</strong> {renderEmphasis(t.instructions.normal.correctBody)}</li>
              <li><strong className="text-warning-yellow">{t.instructions.normal.skipLabel}</strong> {renderEmphasis(t.instructions.normal.skipBody)}</li>
              <li><strong className="text-light-text">{t.instructions.normal.timerLabel}</strong> {t.instructions.normal.timerBody}</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">{t.instructions.normal.peekTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.normal.peekBody)}</p>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">{t.instructions.normal.scoringTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-light-text">{t.instructions.normal.standardLabel}</strong> {t.instructions.normal.standardBody}</li>
              <li><strong className="text-warning-yellow">{t.instructions.normal.luckyLabel}</strong> {renderEmphasis(t.instructions.normal.luckyBody)}</li>
              <li><strong className="text-danger-red">{t.instructions.normal.comboLabel}</strong> {renderEmphasis(t.instructions.normal.comboBody)}</li>
              <li><strong className="text-light-text">{t.instructions.normal.timeBonusLabel}</strong> {t.instructions.normal.timeBonusBody}</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">{t.instructions.normal.powerUpsTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-electric-blue">{t.instructions.normal.freezeLabel}</strong> {renderEmphasis(t.instructions.normal.freezeBody)}</li>
              <li><strong className="text-warning-yellow">{t.instructions.normal.skipFreebieLabel}</strong> {renderEmphasis(t.instructions.normal.skipFreebieBody)}</li>
              <li><strong className="text-cyber-purple">{t.instructions.normal.rushHourLabel}</strong> {renderEmphasis(t.instructions.normal.rushHourBody)}</li>
            </ul>
          </section>
        )}
      </div>
    </>
  );
};

const HellModeInstructions: React.FC = () => {
  const t = useT('game');
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-danger-red tracking-wide animate-pulseOnce instruction-screen-title">
        {t.instructions.hell.title}
      </h2>

      <SectionPager
        labels={[t.instructions.tabs.gameplay, t.instructions.tabs.penalties]}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-danger-red text-dark-metal"
        accentTextClassName="text-danger-red"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-danger-red/50 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 font-heading">{t.instructions.hell.challengeTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.hell.challengeBody)}</p>

            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 mt-4 font-heading">{t.instructions.hell.peekTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.hell.peekBody)}</p>

            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 mt-4 font-heading">{t.instructions.hell.clockTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-cyber-purple">{t.instructions.hell.rushHourLabel}</strong> {renderEmphasis(t.instructions.hell.rushHourBody)}</li>
              <li>{renderEmphasis(t.instructions.hell.rushHourFastBody)}</li>
            </ul>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-danger-red/50 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-danger-red mb-2 font-heading">{t.instructions.hell.skipsTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li>{renderEmphasis(t.instructions.hell.skipStartBody)}</li>
              <li><strong className="text-warning-yellow">{t.instructions.hell.skipPenaltyLabel}</strong> {renderEmphasis(t.instructions.hell.skipPenaltyBody, 'text-danger-red')}</li>
              <li><strong className="text-warning-yellow">{t.instructions.hell.luckySkipLabel}</strong> {renderEmphasis(t.instructions.hell.luckySkipBody, 'text-danger-red')}</li>
              <li><strong className="text-neon-green">{t.instructions.hell.floorLabel}</strong> {renderEmphasis(t.instructions.hell.floorBody)}</li>
              <li><strong className="text-warning-yellow">{t.instructions.hell.freebieLabel}</strong> {renderEmphasis(t.instructions.hell.freebieBody)}</li>
            </ul>
            <p className="mt-4 text-center text-sm sm:text-base text-warning-yellow font-bold">{t.instructions.hell.goodLuck}</p>
          </section>
        )}
      </div>
    </>
  );
};

const TeamModeInstructions: React.FC = () => {
  const t = useT('game');
  const [section, setSection] = useState(0);

  return (
    <>
      <h2 className="w-full shrink-0 text-center text-2xl sm:text-3xl font-heading font-bold text-electric-blue tracking-wide instruction-screen-title">
        {t.instructions.team.title}
      </h2>

      <SectionPager
        labels={[t.instructions.tabs.gameplay, t.instructions.tabs.scoring]}
        activeIndex={section}
        onSelect={setSection}
        activePillClassName="bg-electric-blue text-dark-metal"
        accentTextClassName="text-electric-blue"
      />

      <div key={section} className={SECTION_SCROLL_CLASS}>
        {section === 0 ? (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-1)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">{t.instructions.team.goalTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.team.goalBody)}</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">{t.instructions.team.peekTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.team.peekBody)}</p>

            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 mt-4 font-heading">{t.instructions.team.boxesTitle}</h3>
            <p className="text-muted-text">{renderEmphasis(t.instructions.team.boxesBody)}</p>
          </section>
        ) : (
          <section className="min-h-full p-3 sm:p-4 rounded-[var(--r-lg)] bg-[var(--surface-2)] border border-electric-blue/30 shadow-[var(--elev-2)]">
            <h3 className="text-lg sm:text-xl font-semibold text-electric-blue mb-2 font-heading">{t.instructions.team.scoringTitle}</h3>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-text">
              <li><strong className="text-neon-green">{t.instructions.team.correctLabel}</strong> {t.instructions.team.correctBody}</li>
              <li><strong className="text-danger-red">{t.instructions.team.skipLabel}</strong> {t.instructions.team.skipBody}</li>
              <li><strong className="text-warning-yellow">{t.instructions.team.speedLabel}</strong>
                <ul className="list-['-_'] list-inside space-y-1.5 pl-4 mt-1">
                  <li>{renderEmphasis(t.instructions.team.speedFast)}</li>
                  <li>{renderEmphasis(t.instructions.team.speedMid)}</li>
                </ul>
              </li>
              <li><strong className="text-muted-text italic">{t.instructions.team.note}</strong></li>
            </ul>
          </section>
        )}
      </div>
    </>
  );
};

export const InstructionScreen: React.FC<InstructionScreenProps> = ({ gameMode, onStartPlaying, onGoBackToSetup }) => {
  const t = useT('game');
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
          aria-label={t.instructions.footer.backAria}
        >
          {t.instructions.footer.backToSetup}
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
          aria-label={t.instructions.footer.startAria}
        >
          {
            gameMode === GameMode.HELL ? t.instructions.footer.enterHell
            : gameMode === GameMode.TEAM ? t.instructions.footer.startBattle
            : t.instructions.footer.letsPlay
          }
        </button>
      </div>
    </div>
  );
};
