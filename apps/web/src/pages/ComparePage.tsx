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
import { t, tNode } from '../i18n';

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
      {tNode(yes)}
    </span>
  ) : (
    <span className="no-txt">
      <Icon name="x" />
      {tNode(no)}
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
          <b className="num">{formatRwf(rentRwf)}</b>{' '}
          {rentRwf === lowest && <Best>{t('Lowest')}</Best>}
        </>
      ),
    },
    {
      label: 'Distance',
      key: ({ distanceKm }) => distanceKm,
      cell: ({ distanceKm }) => (
        <>
          <b className="num">{formatKm(distanceKm)}</b>{' '}
          {distanceKm === closest && <Best>{t('Closest')}</Best>}
        </>
      ),
    },
    { label: 'Location', key: ({ area }) => area, cell: ({ area }) => area },
    {
      label: 'Accommodation type',
      key: ({ type, selfContained }) => `${type}-${selfContained}`,
      cell: (property) => (
        <>
          {tNode(typeLabel(property))}
          <br />
          <span className="t-support">{tNode(layoutLabel(property))}</span>
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
            {t('Private')}
          </span>
        ) : (
          <span className="no-txt">
            <Icon name="users" />
            {t('Shared')}
          </span>
        ),
    },
    {
      label: 'Security',
      key: ({ security }) => security,
      cell: ({ security }) => (
        <YesNo value={security} yes={t('Guard / locked gate')} no={t('No guard')} />
      ),
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
        {t('Add a property to compare')}
      </label>
      <select
        className="select"
        id="cmp-add"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="">{t('Add a property…')}</option>
        {others.map(({ id, title, rentRwf }) => (
          <option key={id} value={id}>
            {tNode(title)} · {formatNumber(rentRwf)} {t('RWF')}
          </option>
        ))}
      </select>
      <Button variant="secondary" icon="plus" type="submit">
        {t('Add')}
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
          {t('Rows marked "Differs" are where these properties are not the same.')}
        </p>
        {properties.length < MAX_COMPARE ? (
          <AddProperty />
        ) : (
          <span className="t-support">
            <Icon name="info" /> {t('Maximum of four reached.')}
          </span>
        )}
      </div>
      <div className="table-wrap">
        <table className="cmp">
          <caption className="sr-only">
            {t('Side-by-side comparison of')} {tNode(properties.length)} {t('properties')}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('Property')}</th>
              {properties.map(({ id, title, coverUrl }) => (
                <th scope="col" className="head-cell" key={id}>
                  {coverUrl && <img src={coverUrl} alt="" />}
                  <Link className="cmp-title" to={`/properties/${id}`}>
                    {tNode(title)}
                  </Link>
                  <div className="row cmp-actions">
                    <Link
                      className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      to={`/properties/${id}`}
                      aria-label={t('Details of {title}', { title })}
                    >
                      {t('Details')}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="x"
                      aria-label={t('Remove {title} from compare', { title })}
                      onClick={() => compare.toggle(id)}
                    >
                      {t('Remove')}
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
                  <th scope="row">{tNode(label)}</th>
                  {properties.map((property) => (
                    <td key={property.id}>{tNode(cell(property))}</td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">{t('Action')}</th>
              {properties.map(({ id, title }) => (
                <td key={id}>
                  <Link
                    className={buttonClass({ size: 'sm' })}
                    to={`/properties/${id}/contact`}
                    aria-label={t('Contact the landlord of {title}', { title })}
                  >
                    <Icon name="message" />
                    {t('Contact')}
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
          title={t('Unable to load these properties. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
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
          title={items.length ? t('Add one more property to compare') : t('Nothing to compare yet')}
          text={t('Select Compare on two to four properties. You can also add one here.')}
          actions={
            <Link className={buttonClass()} to="/search">
              <Icon name="search" />
              {t('Return to search')}
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
          <h1 className="t-page">{t('Compare properties')}</h1>
          <p className="muted">{t('Compare up to four properties side by side.')}</p>
        </div>
        {compare.ids.length > 0 && (
          <Button variant="secondary" onClick={compare.clear}>
            {t('Clear comparison')}
          </Button>
        )}
      </div>
      {content()}
    </main>
  );
}
