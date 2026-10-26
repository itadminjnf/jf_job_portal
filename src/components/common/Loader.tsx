import React from 'react';
import styles from './Loader.module.css';

export interface LoaderProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Display mode / layout container */
  variant?: 'inline' | 'button' | 'section' | 'overlay' | 'page';
  /** Color theme of the spinner */
  color?: 'primary' | 'white' | 'navy' | 'orange';
  /** Primary label text */
  text?: string;
  /** Secondary subtitle / hint */
  subtext?: string;
  /** Custom extra CSS classes */
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'inline',
  color = 'primary',
  text,
  subtext,
  className = '',
  ariaLabel = 'Loading...',
}) => {
  // Map size prop to CSS module class
  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    xl: styles.sizeXl,
  }[size];

  // Map variant prop to CSS module class
  const variantClass = {
    inline: styles.inline,
    button: styles.button,
    section: styles.section,
    overlay: styles.overlay,
    page: styles.page,
  }[variant];

  // Map color prop to CSS module class
  const colorClass = {
    primary: styles.colorPrimary,
    white: styles.colorWhite,
    navy: styles.colorNavy,
    orange: styles.colorOrange,
  }[color];

  const isInlineLike = variant === 'inline' || variant === 'button';

  return (
    <div
      role="status"
      aria-label={text || ariaLabel}
      className={`${styles.wrapper} ${variantClass} ${className}`.trim()}
    >
      <span className={`${styles.spinner} ${sizeClass} ${colorClass}`} aria-hidden="true" />
      {text && (
        <span className={isInlineLike ? styles.inlineText : styles.text}>
          {text}
        </span>
      )}
      {subtext && !isInlineLike && (
        <span className={styles.subtext}>{subtext}</span>
      )}
    </div>
  );
};

export default Loader;
