import { EMPTY_FILTERS, ROOM_TYPE_LABELS, type RoomType, type SearchFilters } from '@urcst/shared';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, buttonClass } from '../components/Button';
import { HeaderMenu } from '../components/HeaderMenus';
import { Icon, type IconName } from '../components/Icon';
import { LandingCard } from '../components/LandingCard';
import { PickGroup } from '../components/PickGroup';
import { ErrorState, Skeleton } from '../components/StateBlocks';
import { formatNumber } from '../lib/format';
import { useFeatured, useLocations } from '../student/queries';
import { useRunSearch } from '../student/useHistory';
import { t, tNode } from '../i18n';

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

const CTA_BUTTON =
  'transition-[background-color,border-color,color,translate] duration-200 hover:-translate-y-0.5 active:translate-y-0';

const CTA_CARDS: {
  role: 'STUDENT' | 'LANDLORD';
  icon: IconName;
  title: string;
  text: string;
  tone: string;
  register: string;
  login: string;
}[] = [
  {
    role: 'STUDENT',
    icon: 'user',
    title: 'Looking for a room?',
    text: 'Create a student account to save and compare properties near UR-CST.',
    tone: 'bg-blue text-white dark:bg-[#12213d]',
    register:
      'hover:border-[#0f172a]! hover:bg-[#0f172a]! hover:text-white! dark:hover:border-blue! dark:hover:bg-blue!',
    login: 'border-white! text-white! hover:bg-white! hover:text-[#0f172a]!',
  },
  {
    role: 'LANDLORD',
    icon: 'building',
    title: 'Have a room to rent?',
    text: 'Create a landlord account to list your property for UR-CST students.',
    tone: 'bg-[#0f172a]/60 text-white dark:bg-[#1b3260]',
    register: 'hover:border-blue! hover:bg-blue! hover:text-white!',
    login: 'border-white! hover:bg-white! hover:text-[#0f172a]!',
  },
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
        label={t('Choose {p0}', { p0: label.toLowerCase() })}
        buttonClass={FIELD_BUTTON}
        panelClass={FIELD_MENU}
        open={open}
        onOpenChange={onOpenChange}
        button={
          <>
            <Icon name={icon} />
            <span className="flex min-w-0 flex-col leading-[1.25]">
              <b className="text-sm">{tNode(label)}</b>
              <span
                className={`max-w-[120px] truncate text-[0.8125rem] max-tablet:max-w-none ${picked ? 'font-bold text-blue' : 'text-[#475569] dark:text-muted'}`}
              >
                {tNode(shown)}
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
      aria-label={t('Search accommodation')}
      onSubmit={submit}
    >
      <HeroPicker
        id="location"
        icon="pin"
        label={t('Location')}
        shown={location || 'e.g., Kiyovu, Muhima…'}
        picked={Boolean(location)}
        {...menu('location')}
      >
        <PickGroup
          label={t('Location')}
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
        label={t('Max Budget')}
        shown={budget ? `Up to ${formatNumber(Number(budget))} RWF` : 'Any budget'}
        picked={Boolean(budget)}
        {...menu('budget')}
      >
        <PickGroup
          label={t('Max Budget')}
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
        label={t('Room Type')}
        shown={type ? ROOM_TYPE_LABELS[type] : 'Any room type'}
        picked={Boolean(type)}
        {...menu('type')}
      >
        <PickGroup
          label={t('Room Type')}
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
      <button className={`${buttonClass()} min-w-[132px] text-[1.0625rem]!`} type="submit">
        <Icon name="search" />
        {t('Search')}
      </button>
    </form>
  );
}

const CARD_GRID = 'grid grid-cols-3 gap-7 max-desktop:grid-cols-2 max-phone:grid-cols-1';

function Featured() {
  const { data, isPending, isError, refetch } = useFeatured();

  if (isPending) {
    return (
      <div
        className={CARD_GRID}
        role="status"
        aria-busy="true"
        aria-label={t('Loading accommodation')}
      >
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
        title={t('Unable to load accommodation. Please try again.')}
        text={t('Check your internet connection, then try again.')}
        actions={
          <Button icon="refresh" onClick={() => void refetch()}>
            {t('Try again')}
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
  const { user } = useAuth();

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
          <img className="size-full object-cover object-[center_30%]" src="/hero-campus.jpg" alt="" />
        </div>
        <div className="relative z-2 mx-auto min-h-[330px] max-w-[1440px] pt-11 pr-6 pb-10 pl-16 max-tablet:min-h-0 max-tablet:px-4 max-tablet:pt-5 max-tablet:pb-7">
          <h1
            id="hero-h"
            className="max-w-[12em] text-[3.25rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-[#0f172a] max-tablet:text-4xl dark:text-ink"
          >
            {t('Find Your Next Home')} <em className="text-blue not-italic">{t('Near UR-CST')}</em>
          </h1>
          <p className="mt-3.5 max-w-[30em] text-[1.1875rem] leading-[1.45] text-[#1e293b] dark:text-ink">
            {t(
              'Discover affordable student accommodation near campus. Compare rooms, explore facilities, and connect directly with landlords.',
            )}
          </p>
          <HeroSearch />
        </div>
      </section>
      <section className={`${SECTION} py-14 max-phone:py-10`} aria-labelledby="feat-h">
        <div className="row-between mb-[18px] items-end">
          <div>
            <h2 id="feat-h" className={HEADING}>
              {t('Featured Accommodation')}
            </h2>
            <p className="mt-1 text-ink">
              {t(
                'Recently added, student-friendly options near UR-CST in Kigali. Saving a room does not reserve it.',
              )}
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-[1.0625rem] font-bold text-blue no-underline hover:underline"
            to="/search"
          >
            {t('View All Listings')} <Icon name="arrowR" />
          </Link>
        </div>
        <Featured />
      </section>
      <section className={`${SECTION} pt-2 pb-6 max-phone:py-10`} id="how" aria-labelledby="how-h">
        <div className="rounded-lg bg-[#eef3fc] px-8 py-10 max-tablet:px-[18px] max-tablet:py-7 dark:bg-[#12213d]">
          <div className="mb-8 max-tablet:mb-6">
            <h2 id="how-h" className={`${HEADING} text-[#0f172a] dark:text-ink`}>
              {t('How It Works')}
            </h2>
            <p className="mt-1 text-[#1e293b] dark:text-ink">
              {t('Find your student accommodation in 3 simple steps.')}
            </p>
          </div>
          <ol className="m-0 grid list-none grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 p-0 max-tablet:grid-cols-1">
            {tNode(
              HOW_STEPS.flatMap(({ icon, title, text }, index) => [
                index > 0 && (
                  <li
                    className="grid size-10 place-items-center self-center justify-self-center rounded-full border border-line bg-card text-blue shadow-soft max-tablet:rotate-90"
                    aria-hidden="true"
                    key={`arrow-${title}`}
                  >
                    <Icon name="arrowR" />
                  </li>
                ),
                <li
                  key={title}
                  className="flex flex-col rounded-lg border border-line bg-card p-6 text-ink shadow-soft"
                >
                  <span className="grid size-14 place-items-center rounded-[14px] bg-[#dce7fb] text-blue dark:bg-[#1b3260] [&_.ic]:size-[30px]">
                    <Icon name={icon} />
                  </span>
                  <b className="mt-4 block text-lg">{tNode(title)}</b>
                  <span className="mt-1 block text-base text-muted">{tNode(text)}</span>
                </li>,
              ]),
            )}
          </ol>
        </div>
      </section>
      {!user && (
        <section
          className={`${SECTION} grid grid-cols-2 gap-6 pt-2 pb-14 max-tablet:grid-cols-1 max-phone:pb-10`}
          aria-label={t('Get started')}
        >
          {CTA_CARDS.map(({ role, icon, title, text, tone, register, login }) => (
            <div
              key={role}
              className={`flex flex-col items-start rounded-lg p-8 max-tablet:p-6 ${tone}`}
            >
              <span className="grid size-14 place-items-center rounded-[14px] bg-white/15 [&_.ic]:size-[30px]">
                <Icon name={icon} />
              </span>
              <h2 className="mt-4 text-[1.625rem] font-extrabold tracking-[-0.02em]">
                {tNode(title)}
              </h2>
              <p className="mt-1 mb-6 text-[1.0625rem]">{tNode(text)}</p>
              <div className="mt-auto flex flex-wrap gap-3">
                <Link
                  className={`${buttonClass({ variant: 'secondary', size: 'lg' })} ${CTA_BUTTON} ${register}`}
                  to="/register"
                  state={{ role }}
                >
                  {t('Register')}
                </Link>
                <Link
                  className={`${buttonClass({ variant: 'on-dark', size: 'lg' })} ${CTA_BUTTON} ${login}`}
                  to="/login"
                >
                  {t('Login')}
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
