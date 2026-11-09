import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../lib/format';
import { SIDE_GRADIENT } from '../lib/sideNav';
import { Icon, type IconName } from './Icon';
import { tNode } from '../i18n';

/** A titled card with an optional "see all" link, used on dashboards and history. */
export function DashCard({
  title,
  intro,
  count,
  link,
  children,
}: {
  title: string;
  intro?: string;
  count?: number;
  link?: { to: string; label: string; ariaLabel?: string };
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="m-0 flex items-center gap-2 text-[1.0625rem] leading-snug font-semibold">
            {tNode(title)}
            {count !== undefined && (
              <span className="num rounded-full bg-blue-50 px-2 text-sm text-blue-700">
                {count}
              </span>
            )}
          </h2>
          {intro && <p className="t-support m-0">{tNode(intro)}</p>}
        </div>
        {link && (
          <Link
            className="inline-flex min-h-11 flex-none items-center gap-1 font-semibold whitespace-nowrap text-blue-700"
            to={link.to}
            aria-label={tNode(link.ariaLabel)}
          >
            {tNode(link.label)}
            <Icon name="arrowR" />
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}
/** A number that opens the matching list. It uses the sidebar's blue, so the dashboard reads as one. */
export function StatCard({
  to,
  label,
  value,
  hint,
  icon,
}: {
  to: string;
  label: string;
  value: number;
  hint: string;
  icon: IconName;
}) {
  return (
    <Link
      className={`flex flex-col gap-3 rounded-lg border border-transparent p-5 text-white no-underline shadow-soft transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-raised motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${SIDE_GRADIENT}`}
      to={to}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold">{tNode(label)}</span>
        <span className="grid size-11 flex-none place-items-center rounded-md bg-white/15 [&>.ic]:size-[22px]">
          <Icon name={icon} />
        </span>
      </span>
      <span className="num text-[1.875rem] leading-none font-semibold tracking-tight">
        {formatNumber(value)}
      </span>
      <span className="flex items-center justify-between gap-2 text-sm">
        {tNode(hint)}
        <Icon name="arrowR" />
      </span>
    </Link>
  );
}
