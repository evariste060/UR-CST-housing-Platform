/** The sidebar's blue, also used by the dashboard number cards. */
export const SIDE_GRADIENT = 'bg-linear-to-b from-side-from via-side-via to-side-to';

/**
 * The dark-blue sidebar shared by the student, landlord and administrator dashboards, and the
 * landlord's small-screen menu. The colours are tokens, so dark mode and high contrast still apply.
 */
export const SIDE_SURFACE = `border-r-0 ${SIDE_GRADIENT} text-white max-tablet:border-t-0`;

/** The small "Menu" heading at the top of a sidebar. */
export const SIDE_HEADING =
  'm-0 px-3 pb-2 text-sm font-semibold tracking-wide text-white/80 uppercase';

/** Colours for one item: soft white, a light wash on hover, a brighter blue for the current page. */
export const SIDE_ITEM =
  'text-white/90 transition-colors duration-150 hover:bg-white/10 hover:text-white motion-reduce:transition-none aria-[current=page]:bg-blue aria-[current=page]:bg-linear-to-r aria-[current=page]:from-side-active-from aria-[current=page]:to-side-active-to aria-[current=page]:font-semibold aria-[current=page]:text-white aria-[current=page]:shadow-none';

/** At tablet width and below, the student and administrator sidebars become a toolbar. */
export const SIDE_TOOLBAR = `side-toolbar flex flex-col ${SIDE_SURFACE} max-tablet:fixed max-tablet:inset-x-0 max-tablet:top-auto max-tablet:bottom-0 max-tablet:z-[43] max-tablet:h-auto max-tablet:flex-row`;

export const SIDE_LINK = `group ${SIDE_ITEM} max-tablet:relative max-tablet:flex-1 max-tablet:justify-center`;

export const SIDE_LABEL = 'max-tablet:sr-only';

export const SIDE_COUNT =
  'count-pill bg-white text-side-from max-tablet:absolute max-tablet:top-0 max-tablet:left-1/2 max-tablet:ml-1.5';

export const SIDE_LOGOUT = `mt-auto flex min-h-11 w-full flex-none cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 py-[11px] text-left text-base font-medium whitespace-nowrap ${SIDE_ITEM} max-tablet:hidden`;
