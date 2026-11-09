import { Icon } from '../components/Icon';
import { tNode } from '../i18n';

/** Pick-one tabs with a count each. The current one is solid blue with a tick. */
export function CountTabs<T extends string>({
  label,
  value,
  options,
  counts,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  counts?: Partial<Record<T, number>>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tNode(label)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            className="group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-4 font-semibold text-ink transition-colors hover:border-blue hover:bg-blue-50 aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white"
            onClick={() => onChange(option.value)}
          >
            {on && <Icon name="check" />}
            {tNode(option.label)}
            {counts?.[option.value] !== undefined && (
              <span className="num min-w-7 rounded-full bg-slate-100 px-2 text-sm text-ink group-aria-pressed:bg-white group-aria-pressed:text-[#0f172a]">
                {tNode(counts[option.value])}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <label className="sr-only" htmlFor={id}>
        {tNode(label)}
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted">
        <Icon name="search" />
      </span>
      <input
        className="input pl-10!"
        id={id}
        type="search"
        value={value}
        placeholder={tNode(placeholder)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
