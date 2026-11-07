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

const SECTION = 'mx-auto max-w-[1280px] px-6 max-phone:px-4 desktop:max-w-[1440px] desktop:px-16';
const HEADING = 'text-[2rem] font-extrabold tracking-[-0.02em] max-phone:text-[1.625rem]';
const FIELD_BUTTON =
  'flex min-h-14 w-[190px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#d5dce6] bg-white px-3 py-1.5 text-left text-[#0f172a] hover:border-blue aria-expanded:border-blue max-tablet:w-full dark:border-line-strong dark:bg-card dark:text-ink dark:hover:border-blue dark:aria-expanded:border-blue [&>.ic:first-child]:size-[22px] [&>.ic:first-child]:text-blue [&>.ic:last-child]:ml-auto [&>.ic:last-child]:size-[18px]';
const FIELD_MENU = 'right-auto left-0 w-[340px] max-tablet:w-[min(340px,calc(100vw-48px))]';

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
    <div>
      <HeaderMenu
        id={`hero-${id}`}
        label={`Choose ${label.toLowerCase()}`}
        buttonClass={FIELD_BUTTON}
        panelClass={FIELD_MENU}
        open={open}
        onOpenChange={onOpenChange}
        button={
          <>
            <Icon name={icon} />
            <span className="flex min-w-0 flex-col leading-[1.25]">
              <b className="text-sm">{label}</b>
              <span
                className={`max-w-[120px] truncate text-[0.8125rem] max-tablet:max-w-none ${picked ? 'font-bold text-blue' : 'text-[#475569] dark:text-muted'}`}
              >
                {shown}
              </span>
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
    <form
      className="mt-6 inline-flex flex-wrap items-stretch gap-2.5 rounded-[14px] border border-[#dce3ee] bg-white p-3 shadow-raised max-tablet:grid max-tablet:w-full max-tablet:grid-cols-1 dark:border-line-strong dark:bg-card dark:text-ink"
      aria-label="Search accommodation"
      onSubmit={submit}
    >
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
      <button
        className="btn btn-primary min-w-[132px] rounded-[10px] text-[1.0625rem]"
        type="submit"
      >
        <Icon name="search" />
        Search
      </button>
    </form>
  );
}

const CARD_GRID = 'grid grid-cols-3 gap-7 max-desktop:grid-cols-2 max-phone:grid-cols-1';

function Featured() {
  const { data, isPending, isError, refetch } = useFeatured();

  if (isPending) {
    return (
      <div className={CARD_GRID} role="status" aria-busy="true" aria-label="Loading accommodation">
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
    <div className={CARD_GRID}>
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
      <section
        className="relative border-b border-line bg-[linear-gradient(90deg,#e8f0fe_0%,#eef4ff_42%,#f3f7ff_100%)] dark:bg-[linear-gradient(90deg,#0e1a33_0%,#10203d_100%)]"
        aria-labelledby="hero-h"
      >
        <div
          className="absolute inset-y-0 right-0 w-[58%] before:absolute before:inset-0 before:z-1 before:bg-[linear-gradient(90deg,#eef4ff_0%,rgba(238,244,255,0.85)_10%,rgba(238,244,255,0)_32%)] before:content-[''] max-tablet:relative max-tablet:h-[200px] max-tablet:w-full max-tablet:before:bg-[linear-gradient(0deg,#eef4ff_0%,rgba(238,244,255,0)_40%)] dark:before:bg-[linear-gradient(90deg,#10203d_0%,rgba(16,32,61,0.8)_10%,rgba(16,32,61,0)_32%)]"
          aria-hidden="true"
        >
          <img className="size-full object-cover object-[60%_center]" src="/hero.jpg" alt="" />
        </div>
        <div className="relative z-2 mx-auto min-h-[330px] max-w-[1440px] pt-11 pr-6 pb-10 pl-16 max-tablet:min-h-0 max-tablet:px-4 max-tablet:pt-5 max-tablet:pb-7">
          <h1
            id="hero-h"
            className="max-w-[12em] text-[3.25rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-[#0f172a] max-tablet:text-4xl dark:text-ink"
          >
            Find Your Next Home <em className="text-blue not-italic">Near UR-CST</em>
          </h1>
          <p className="mt-3.5 max-w-[30em] text-[1.1875rem] leading-[1.45] text-[#1e293b] dark:text-ink">
            Discover affordable student accommodation near campus. Compare rooms, explore
            facilities, and connect directly with landlords.
          </p>
          <HeroSearch />
        </div>
      </section>
      <section className={`${SECTION} py-14 max-phone:py-10`} aria-labelledby="feat-h">
        <div className="row-between mb-[18px] items-end">
          <div>
            <h2 id="feat-h" className={HEADING}>
              Featured Accommodation
            </h2>
            <p className="mt-1 text-ink">
              Recently added, student-friendly options near UR-CST in Kigali. Saving a room does not
              reserve it.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-[1.0625rem] font-bold text-blue no-underline hover:underline"
            to="/search"
          >
            View All Listings <Icon name="arrowR" />
          </Link>
        </div>
        <Featured />
      </section>
      <section className={`${SECTION} pt-2 pb-6 max-phone:py-10`} id="how" aria-labelledby="how-h">
        <div className="grid grid-cols-[300px_1fr] items-center gap-6 rounded-lg bg-[#eef3fc] px-8 py-[18px] max-desktop:grid-cols-1 max-tablet:p-[18px] dark:bg-[#12213d]">
          <div className="border-r border-[#c9d5ea] pr-6 max-desktop:border-r-0 max-desktop:pr-0 dark:border-line-strong">
            <h2 id="how-h" className={`${HEADING} text-[#0f172a] dark:text-ink`}>
              How It Works
            </h2>
            <p className="mt-1 text-[#1e293b] dark:text-ink">
              Find your student accommodation in 3 simple steps.
            </p>
          </div>
          <ol className="m-0 flex list-none items-center gap-4 p-0 max-tablet:flex-col max-tablet:items-stretch">
            {HOW_STEPS.flatMap(({ icon, title, text }, index) => [
              index > 0 && (
                <li
                  className="flex-none text-[#0f172a] max-tablet:hidden dark:text-ink"
                  aria-hidden="true"
                  key={`arrow-${title}`}
                >
                  <Icon name="arrowR" />
                </li>
              ),
              <li
                key={title}
                className="flex flex-1 items-start gap-4 text-[#0f172a] dark:text-ink"
              >
                <span className="grid size-14 flex-none place-items-center rounded-[14px] bg-[#dce7fb] text-blue dark:bg-[#1b3260] [&_.ic]:size-[30px]">
                  <Icon name={icon} />
                </span>
                <span>
                  <b className="block text-[1.0625rem]">{title}</b>
                  <span className="mt-0.5 block text-[0.9375rem] text-[#1e293b] dark:text-ink">
                    {text}
                  </span>
                </span>
              </li>,
            ])}
          </ol>
        </div>
      </section>
      <section
        className={`${SECTION} grid grid-cols-4 pt-2 pb-14 max-desktop:grid-cols-2 max-desktop:gap-y-5 max-phone:grid-cols-1 max-phone:pb-10`}
        aria-label="Why use UR-CST Housing"
      >
        {TRUST.map(({ icon, title, text }) => (
          <div
            key={title}
            className="flex items-start gap-[18px] border-line-strong px-7 py-2 not-first:border-l max-desktop:nth-3:border-l-0 max-phone:border-l-0 max-phone:px-0"
          >
            <span className="[&_.ic]:size-12 [&_.ic]:stroke-[1.8] [&_.ic]:text-blue">
              <Icon name={icon} />
            </span>
            <span>
              <b className="block text-[1.0625rem]">{title}</b>
              <span className="mt-0.5 block text-[0.9375rem] text-ink">{text}</span>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
