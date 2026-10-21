import React from 'react';

/**
 * Rules and result copy mark inline emphasis with `**…**`. Rendering it here keeps a
 * translated sentence one whole string instead of pre-split JSX fragments, so a
 * translator can move the emphasis without touching code.
 */
export const renderEmphasis = (text: string, className = 'text-light-text'): React.ReactNode[] =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className={className}>{part}</strong>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );
