import { useQuery } from '@tanstack/react-query';
import type { PropertySummary } from '@urcst/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AvailabilityBadge, badgeClass } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { ListingCard } from '../components/ListingCard';
import { EmptyState, ErrorState, SkeletonCards } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import { formatNumber, formatRwf, layoutLabel, typeLabel, formatKm } from '../lib/format';
import { MAX_COMPARE, useCompare } from '../student/CompareProvider';
import { usePropertiesByIds } from '../student/queries';

interface Row {
  label: string;
  cell: (property: PropertySummary) => ReactNode;
  /** Two values that match here mean the row is not marked "Differs". */
  key: (property: PropertySummary) => string | number | boolean;
}

function YesNo({
  value,
  yes = 'Included',
  no = 'Not included',
}: {
  value: boolean;
  yes?: string;
  no?: string;
}) {
  return value ? (
    <span className="yes-txt">
      <Icon name="check" />
      {yes}
    </span>
  ) : (
    <span className="no-txt">
      <Icon name="x" />
      {no}
    </span>
  );
}

function Best({ children }: { children: ReactNode }) {
  return <span className={`${badgeClass('available')} best`}>{children}</span>;
}

function rows(properties: PropertySummary[]): Row[] {
  const lowest = Math.min(...properties.map(({ rentRwf }) => rentRwf));
  const closest = Math.min(...properties.map(({ distanceKm }) => distanceKm));

  return [
    {
      label: 'Monthly rent',
      key: ({ rentRwf }) => rentRwf,
      cell: ({ rentRwf }) => (
        <>
          <b className="num">{formatRwf(rentRwf)}</b> {rentRwf === lowest && <Best>Lowest</Best>}
        </>
      ),
    },
    {
      label: 'Distance',
      key: ({ distanceKm }) => distanceKm,
      cell: ({ distanceKm }) => (
        <>
          <b className="num">{formatKm(distanceKm)}</b>{' '}
          {distanceKm === closest && <Best>Closest</Best>}
        </>
      ),
    },
    { label: 'Location', key: ({ area }) => area, cell: ({ area }) => area },
    {
      label: 'Accommodation type',
      key: ({ type, selfContained }) => `${type}-${selfContained}`,
      cell: (property) => (
        <>
          {typeLabel(property)}
          <br />
          <span className="t-support">{layoutLabel(property)}</span>
        </>
      ),
    },
    { label: 'Water', key: ({ water }) => water, cell: ({ water }) => <YesNo value={water} /> },
    {
      label: 'Electricity',
      key: ({ electricity }) => electricity,
      cell: ({ electricity }) => <YesNo value={electricity} />,
    },
    {
      label: 'Bathroom',
      key: ({ bathroom }) => bathroom,
      cell: ({ bathroom }) =>
        bathroom === 'PRIVATE' ? (
          <span className="yes-txt">
            <Icon name="check" />
            Private
          </span>
        ) : (
          <span className="no-txt">
            <Icon name="users" />
            Shared
          </span>
        ),
    },
    {
      label: 'Security',
      key: ({ security }) => security,
      cell: ({ security }) => <YesNo value={security} yes="Guard / locked gate" no="No guard" />,
    },
    {
      label: 'Availability',
      key: ({ availability }) => availability,
      cell: ({ availability }) => <AvailabilityBadge availability={availability} />,
    },
  ];
}

function AddProperty() {
  const compare = useCompare();
  const toast = useToast();
  const [choice, setChoice] = useState('');
  const { data } = useQuery({
    queryKey: ['compare-options'],
    queryFn: async () => (await api.properties(new URLSearchParams({ pageSize: '50' }))).items,
  });
  const others = (data ?? []).filter(({ id }) => !compare.isComparing(id));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!choice) {
      toast('Choose a property to add.', { type: 'error' });
      return;
    }
    compare.add(choice);
    setChoice('');
  }

  return (
    <form className="row cmp-add" onSubmit={submit}>
      <label htmlFor="cmp-add" className="sr-only">
        Add a property to compare
      </label>
      <select
        className="select"
        id="cmp-add"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="">Add a property…</option>
        {others.map(({ id, title, rentRwf }) => (
          <option key={id} value={id}>
            {title} · {formatNumber(rentRwf)} RWF
          </option>
        ))}
      </select>
      <Button variant="secondary" icon="plus" type="submit">
        Add
      </Button>
    </form>
  );
}

function CompareTable({ properties }: { properties: PropertySummary[] }) {
  const compare = useCompare();

  return (
    <>
      <div className="row-between cmp-head">
        <p className="tip">
          <Icon name="info" />
          Rows marked &quot;Differs&quot; are where these properties are not the same.
        </p>
        {properties.length < MAX_COMPARE ? (
          <AddProperty />
        ) : (
          <span className="t-support">
            <Icon name="info" /> Maximum of four reached.
          </span>
        )}
      </div>
      <div className="table-wrap">
        <table className="cmp">
          <caption className="sr-only">
            Side-by-side comparison of {properties.length} properties
          </caption>
          <thead>
            <tr>
              <th scope="col">Property</th>
              {properties.map(({ id, title, coverUrl }) => (
                <th scope="col" className="head-cell" key={id}>
                  {coverUrl && <img src={coverUrl} alt="" />}
                  <Link className="cmp-title" to={`/properties/${id}`}>
                    {title}
                  </Link>
                  <div className="row cmp-actions">
                    <Link
                      className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      to={`/properties/${id}`}
                      aria-label={`Details of ${title}`}
                    >
                      Details
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="x"
                      aria-label={`Remove ${title} from compare`}
                      onClick={() => compare.toggle(id)}
                    >
                      Remove
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows(properties).map(({ label, cell, key }) => {
              const differs = new Set(properties.map(key)).size > 1;
              return (
                <tr key={label} className={differs ? 'diff' : undefined}>
                  <th scope="row">{label}</th>
                  {properties.map((property) => (
                    <td key={property.id}>{cell(property)}</td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">Action</th>
              {properties.map(({ id, title }) => (
                <td key={id}>
                  <Link
                    className={buttonClass({ size: 'sm' })}
                    to={`/properties/${id}/contact`}
                    aria-label={`Contact the landlord of ${title}`}
                  >
                    <Icon name="message" />
                    Contact
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ComparePage() {
  const compare = useCompare();
  const { items, isPending, isError, refetch } = usePropertiesByIds(compare.ids);

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load these properties. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (isPending) return <SkeletonCards count={2} />;
    if (items.length >= 2) return <CompareTable properties={items} />;

    return (
      <>
        <EmptyState
          icon="compare"
          title={items.length ? 'Add one more property to compare' : 'Nothing to compare yet'}
          text="Select Compare on two to four properties. You can also add one here."
          actions={
            <Link className={buttonClass()} to="/search">
              <Icon name="search" />
              Return to search
            </Link>
          }
        />
        <div className="cmp-empty-add">
          <AddProperty />
        </div>
        {items.length > 0 && (
          <div className="grid-cards cmp-empty-cards">
            {items.map((property) => (
              <ListingCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Compare properties</h1>
          <p className="muted">Compare up to four properties side by side.</p>
        </div>
        {compare.ids.length > 0 && (
          <Button variant="secondary" onClick={compare.clear}>
            Clear comparison
          </Button>
        )}
      </div>
      {content()}
    </main>
  );
}
