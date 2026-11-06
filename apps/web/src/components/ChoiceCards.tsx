import { Icon, type IconName } from './Icon';

interface Choice<T extends string> {
  value: T;
  icon: IconName;
  title: string;
  description: string;
}

interface ChoiceCardsProps<T extends string> {
  options: Choice<T>[];
  onChoose: (value: T) => void;
}

export function ChoiceCards<T extends string>({ options, onChoose }: ChoiceCardsProps<T>) {
  return (
    <div className="choice-grid">
      {options.map(({ value, icon, title, description }) => (
        <button key={value} type="button" className="choice" onClick={() => onChoose(value)}>
          <Icon name={icon} />
          <span>
            <b>{title}</b>
            <span className="t-support choice-text">{description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
