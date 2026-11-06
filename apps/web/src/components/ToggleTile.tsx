import { Icon, type IconName } from './Icon';

export function ToggleTile({
  label,
  icon,
  pressed,
  onToggle,
}: {
  label: string;
  icon: IconName;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="ptile" aria-pressed={pressed} onClick={onToggle}>
      <Icon name={pressed ? 'check' : icon} />
      <span>{label}</span>
      <span className="st">{pressed ? 'Required' : 'Not required'}</span>
    </button>
  );
}
