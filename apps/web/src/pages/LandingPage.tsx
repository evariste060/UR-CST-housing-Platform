import { EMPTY_FILTERS, ROOM_TYPE_LABELS, type RoomType, type SearchFilters } from '@urcst/shared';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { HeaderMenu } from '../components/HeaderMenus';
import { Icon, type IconName } from '../components/Icon';
import { LandingCard } from '../components/LandingCard';
import { PickGroup } from '../components/PickGroup';
import { ErrorState, Skeleton } from '../components/StateBlocks';
import { formatNumber } from '../lib/format';
import { useFeatured, useLocations } from '../student/queries';
import { useRunSearch } from '../student/useHistory';

const BUDGETS = [
  { value: '', label: 'Any budget' },
  { value: '50000', label: 'Up to 50,000 RWF' },
  { value: '75000', label: 'Up to 75,000 RWF' },
  { value: '100000', label: 'Up to 100,000 RWF' },
  { value: '150000', label: 'Up to 150,000 RWF' },
];

const ROOM_TYPES: { value: RoomType; icon: IconName }[] = [
  { value: 'SINGLE', icon: 'bed' },
  { value: 'SHARED', icon: 'users' },
  { value: 'STUDIO', icon: 'door' },
  { value: 'APARTMENT', icon: 'building' },
];

const HOW_STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'search',
    title: '1. Search Accommodation',
    text: 'Find rooms near UR-CST by location, budget, and room type.',
  },
  {
    icon: 'layers',
    title: '2. Compare Options',
    text: 'Check prices, distance from campus, facilities, and availability.',
  },
  {
    icon: 'message',
    title: '3. Contact Landlord',
    text: 'Get in touch directly with the landlord and arrange a viewing.',
  },
];

const TRUST: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'shieldcheck',
    title: 'Checked Listings',
    text: 'Every listing is reviewed by an administrator before students see it.',
  },
  {
    icon: 'pin',
    title: 'Near Campus',
    text: 'Accommodation close to UR-CST in Kigali, with the distance on every listing.',
  },
  {
    icon: 'coins',
    title: 'Affordable Prices',
    text: 'Clear monthly rent in RWF to fit your budget.',
  },
  {
    icon: 'bolt',
    title: 'Easy Contact',
    text: 'Call, WhatsApp or message landlords from the platform.',
  },
];

type HeroField = 'location' | 'budget' | 'type';

interface HeroPickerProps {
  id: HeroField;
  icon: IconName;
  label: string;
  shown: string;
  picked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function HeroPicker({
  id,
  icon,
  label,
  shown,
  picked,
  open,
  onOpenChange,
  children,
}: HeroPickerProps) {
  return (
    <div className="hf-wrap">
      <HeaderMenu
        id={`hero-${id}`}
        label={`Choose ${label.toLowerCase()}`}
        buttonClass="hfield"
        panelClass="hf-menu"
        open={open}
        onOpenChange={onOpenChange}
        button={
          <>
            <Icon name={icon} />
            <span className="hf-txt">
              <b>{label}</b>
              <span className={picked ? 'hf-val picked-val' : 'hf-val'}>{shown}</span>
            </span>
            <Icon name="chevD" />
          </>
        }
      >
        {children}
      </HeaderMenu>
    </div>
  );
}

function HeroSearch() {
  const runSearch = useRunSearch();
  const { data: locations = [] } = useLocations();
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [type, setType] = useState<RoomType | ''>('');
  const [open, setOpen] = useState<HeroField | null>(null);

  const menu = (field: HeroField) => ({
    open: open === field,
    onOpenChange: (next: boolean) => setOpen(next ? field : null),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const filters: SearchFilters = {
      ...EMPTY_FILTERS,
      q: location,
      maxRent: budget ? Number(budget) : undefined,
      types: type ? [type] : [],
    };
    runSearch(filters);
  }

  return (
    <form className="hero-bar" aria-label="Search accommodation" onSubmit={submit}>
      <HeroPicker
        id="location"
        icon="pin"
        label="Location"
        shown={location || 'e.g., Kiyovu, Muhima…'}
        picked={Boolean(location)}
        {...menu('location')}
      >
        <PickGroup
          label="Location"
          value={location}
          compact
          options={[
            { value: '', label: 'Any location', icon: 'map' },
            ...locations.map(({ name }) => ({ value: name, label: name, icon: 'pin' as IconName })),
          ]}
          onChange={(value) => {
            setLocation(value);
            setOpen(null);
          }}
        />
      </HeroPicker>
      <HeroPicker
        id="budget"
        icon="coins"
        label="Max Budget"
        shown={budget ? `Up to ${formatNumber(Number(budget))} RWF` : 'Any budget'}
        picked={Boolean(budget)}
        {...menu('budget')}
      >
        <PickGroup
          label="Max Budget"
          value={budget}
          compact
          options={BUDGETS}
          onChange={(value) => {
            setBudget(value);
            setOpen(null);
          }}
        />
      </HeroPicker>
      <HeroPicker
        id="type"
        icon="bed"
        label="Room Type"
        shown={type ? ROOM_TYPE_LABELS[type] : 'Any room type'}
        picked={Boolean(type)}
        {...menu('type')}
      >
        <PickGroup
          label="Room Type"
          value={type}
          compact
          options={[
            { value: '' as const, label: 'Any room type', icon: 'home' as IconName },
            ...ROOM_TYPES.map(({ value, icon }) => ({
              value,
              icon,
              label: ROOM_TYPE_LABELS[value],
            })),
          ]}
          onChange={(value) => {
            setType(value);
            setOpen(null);
          }}
        />
      </HeroPicker>
      <button className="btn btn-primary hb-go" type="submit">
        <Icon name="search" />
        Search
      </button>
    </form>
  );
}

function Featured() {
  const { data, isPending, isError, refetch } = useFeatured();

  if (isPending) {
    return (
      <div className="lgrid" role="status" aria-busy="true" aria-label="Loading accommodation">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} height={320} />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorState
        icon="wifi"
        title="Unable to load accommodation. Please try again."
        text="Check your internet connection, then try again."
        actions={
          <Button icon="refresh" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  return (
    <div className="lgrid">
      {data.map((property) => (
        <LandingCard key={property.id} property={property} />
      ))}
    </div>
  );
}

export function LandingPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/how-it-works') document.getElementById('how')?.scrollIntoView?.();
  }, [pathname]);

  return (
    <main id="main">
      <section className="hero2" aria-labelledby="hero-h">
        <div className="hero2-img" aria-hidden="true">
          <img src="/hero.jpg" alt="" />
        </div>
        <div className="in">
          <h1 id="hero-h">
            Find Your Next Home <em>Near UR-CST</em>
          </h1>
          <p className="lead">
            Discover affordable student accommodation near campus. Compare rooms, explore
            facilities, and connect directly with landlords.
          </p>
          <HeroSearch />
        </div>
      </section>
      <section className="section feat" aria-labelledby="feat-h">
        <div className="row-between feat-head">
          <div>
            <h2 id="feat-h">Featured Accommodation</h2>
            <p>
              Recently added, student-friendly options near UR-CST in Kigali. Saving a room does not
              reserve it.
            </p>
          </div>
          <Link className="view-all" to="/search">
            View All Listings <Icon name="arrowR" />
          </Link>
        </div>
        <Featured />
      </section>
      <section className="section how-section" id="how" aria-labelledby="how-h">
        <div className="howband">
          <div className="how-intro">
            <h2 id="how-h">How It Works</h2>
            <p>Find your student accommodation in 3 simple steps.</p>
          </div>
          <ol className="how-steps">
            {HOW_STEPS.flatMap(({ icon, title, text }, index) => [
              index > 0 && (
                <li className="how-arrow" aria-hidden="true" key={`arrow-${title}`}>
                  <Icon name="arrowR" />
                </li>
              ),
              <li key={title}>
                <span className="how-ic">
                  <Icon name={icon} />
                </span>
                <span>
                  <b>{title}</b>
                  <span>{text}</span>
                </span>
              </li>,
            ])}
          </ol>
        </div>
      </section>
      <section className="section trust2" aria-label="Why use UR-CST Housing">
        {TRUST.map(({ icon, title, text }) => (
          <div key={title}>
            <span className="t-ic">
              <Icon name={icon} />
            </span>
            <span>
              <b>{title}</b>
              <span>{text}</span>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
