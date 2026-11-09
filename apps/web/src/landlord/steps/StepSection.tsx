import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { tNode } from '../../i18n';

/** A titled group of questions inside a wizard step, divided from the next by a line. */
export function StepSection({
  icon,
  title,
  intro,
  children,
}: {
  icon: IconName;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-b border-line pb-7 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="grid size-10 flex-none place-items-center rounded-md bg-blue-50 text-blue-700">
          <Icon name={icon} />
        </span>
        <div>
          <h3 className="m-0 text-[1.0625rem] font-semibold">{tNode(title)}</h3>
          {intro && <p className="t-help m-0">{tNode(intro)}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** The sections of one step. */
export function StepSections({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-7">{children}</div>;
}
