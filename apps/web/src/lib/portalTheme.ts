/**
 * The one blue used everywhere, for guests and signed-in people alike: deep enough to keep white
 * text at 4.5:1. In dark mode, plain links and blue text switch to the lighter blue so they stay
 * readable on the dark background.
 */
export const BLUE_THEME =
  '[--blue:#2563eb] dark:[--blue:#3d6be0] high-contrast:[--blue:#1d4ed8] dark:[&_a:not([class])]:text-blue-700 dark:[&_.text-blue]:text-blue-700 dark:[&_.aa]:text-blue-700 dark:[&_.link-btn]:text-blue-700';

/**
 * The signed-in look for landlords and students: the shared blue, smaller headings, and
 * semi-bold instead of bold for emphasis.
 */
export const PORTAL_THEME = `portal ${BLUE_THEME} [&_.t-page]:text-[1.75rem] [&_.t-page]:font-semibold max-phone:[&_.t-page]:text-[1.5rem] [&_.t-section]:text-[1.25rem] [&_.t-section]:font-semibold [&_b]:font-semibold [&_strong]:font-semibold [&_th]:font-semibold`;
