import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { t, tNode } from '../i18n';

interface StateProps {
  icon?: IconName;
  title: string;
  text: string;
  actions?: ReactNode;
}

function StateBlock({
  tone,
  role,
  icon,
  title,
  text,
  actions,
}: StateProps & { tone: string; role: 'alert' | 'status'; icon: IconName }) {
  return (
    <div className={`state ${tone}`.trim()} role={role}>
      <div className="state-ic">
        <Icon name={icon} />
      </div>
      <h2 className="state-title">{tNode(title)}</h2>
      <p>{tNode(text)}</p>
      {actions && <div className="row">{tNode(actions)}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'info', ...props }: StateProps) {
  return <StateBlock tone="" role="status" icon={icon} {...props} />;
}

export function SuccessState({ icon = 'check', ...props }: StateProps) {
  return <StateBlock tone="success" role="status" icon={icon} {...props} />;
}

export function ErrorState({ icon = 'alert', ...props }: StateProps) {
  return <StateBlock tone="error" role="alert" icon={icon} {...props} />;
}

export function Skeleton({ height, width }: { height: number; width?: string }) {
  return <div className="skel" style={{ height, width }} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid-cards"
      role="status"
      aria-busy="true"
      aria-label={t('Loading accommodation')}
    >
      {tNode(
        Array.from({ length: count }, (_, index) => (
          <div className="pcard" key={index}>
            <div className="media skel" />
            <div className="body">
              <Skeleton height={26} width="60%" />
              <Skeleton height={16} width="45%" />
              <Skeleton height={16} width="80%" />
              <Skeleton height={36} />
            </div>
          </div>
        )),
      )}
    </div>
  );
}
