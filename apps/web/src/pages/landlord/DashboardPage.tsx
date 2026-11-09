import type { LandlordInquiry, LandlordProperty, LandlordSummary } from '@urcst/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { badgeClass } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { StatCard } from '../../components/DashCard';
import { Icon, type IconName } from '../../components/Icon';
import { ErrorState, Skeleton } from '../../components/StateBlocks';
import { formatWhen, initials } from '../../lib/format';
import { ListingStatusBadge, PropertyThumb } from '../../landlord/ListingStatusBadge';
import {
  Availability,
  PropertyActions,
  PropertyMeta,
  PropertyTable,
  Rent,
} from '../../landlord/PropertyTable';
import { useLandlordSummary } from '../../landlord/queries';
import { PLACEHOLDER_TITLE, useListingActions } from '../../landlord/useListingActions';
import { t, tNode } from '../../i18n';

const ADD_PROPERTY = '/landlord/properties/new';
const PREVIEW_LENGTH = 90;

const TONES = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-text',
  amber: 'bg-amber-50 text-amber-text',
};
type Tone = keyof typeof TONES;

function IconTile({ icon, tone, small = false }: { icon: IconName; tone: Tone; small?: boolean }) {
  return (
    <span
      className={`grid flex-none place-items-center rounded-md ${small ? 'size-10' : 'size-11 [&>.ic]:size-[22px]'} ${TONES[tone]}`}
    >
      <Icon name={icon} />
    </span>
  );
}

function Card({
  title,
  intro,
  link,
  children,
}: {
  title: string;
  intro?: string;
  link?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[1.0625rem] leading-snug font-semibold">{tNode(title)}</h2>
          {intro && <p className="t-support m-0">{tNode(intro)}</p>}
        </div>
        {link && (
          <Link
            className="inline-flex min-h-11 flex-none items-center gap-1 font-semibold whitespace-nowrap text-blue-700"
            to={link.to}
          >
            {tNode(link.label)}
            <Icon name="arrowR" />
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

function RecentProperties({
  properties,
  onToggle,
}: {
  properties: LandlordProperty[];
  onToggle: (property: LandlordProperty) => void;
}) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="muted m-0">
          {t('Add your first property to start receiving student inquiries.')}
        </p>
        <Link className={buttonClass()} to={ADD_PROPERTY}>
          <Icon name="plus" />
          {t('Add Property')}
        </Link>
      </div>
    );
  }
  return (
    <>
      <PropertyTable
        items={properties}
        caption={t('Your most recently updated properties')}
        onToggle={onToggle}
      />
      <ul className="m-0 flex list-none flex-col p-0 min-[1440px]:hidden">
        {properties.map((property) => (
          <li
            key={property.id}
            className="flex flex-col gap-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0"
            aria-label={property.title || PLACEHOLDER_TITLE}
          >
            <div className="flex gap-3">
              <PropertyThumb url={property.coverUrl} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <b className="line-clamp-2 break-words">{property.title || PLACEHOLDER_TITLE}</b>
                  <Rent rentRwf={property.rentRwf} />
                </span>
                <PropertyMeta property={property} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap gap-2">
                <Availability property={property} />
                <ListingStatusBadge status={property.reviewStatus} />
              </span>
              <PropertyActions property={property} onToggle={onToggle} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function InquiryRow({ inquiry }: { inquiry: LandlordInquiry }) {
  const { id, student, property, status, lastMessage } = inquiry;
  const preview =
    lastMessage.body.length > PREVIEW_LENGTH
      ? `${lastMessage.body.slice(0, PREVIEW_LENGTH)}…`
      : lastMessage.body;

  return (
    <Link
      className="mini -mx-3 flex items-start gap-3 rounded-md border-0! px-3! py-3! text-ink no-underline transition-colors hover:bg-surface"
      to={`/landlord/inquiries?open=${id}`}
    >
      <span className="grid size-11 flex-none place-items-center rounded-full bg-blue-50 font-semibold text-blue-700">
        {initials(student)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <b className="truncate">{tNode(student)}</b>
          <span className="num flex-none text-sm text-muted">
            {tNode(formatWhen(lastMessage.createdAt))}
          </span>
        </span>
        <span className="truncate text-sm text-muted">{tNode(property.title)}</span>
        <span className="mt-1 flex items-center justify-between gap-3">
          <span className="truncate">
            {lastMessage.fromLandlord && <span className="text-muted">{t('You:')} </span>}
            {tNode(preview)}
          </span>
          {status === 'NEW' && (
            <span className={`${badgeClass('new')} flex-none`}>
              <span className="dot" aria-hidden="true" />
              {t('New')}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function attentionItems({ newInquiries, changes, drafts }: LandlordSummary) {
  const items: { icon: IconName; tone: Tone; title: string; text: string; to: string }[] = [];

  if (newInquiries) {
    items.push({
      icon: 'message',
      tone: 'blue',
      title: `${plural(newInquiries, 'inquiry needs', 'inquiries need')} a reply`,
      text: 'Students are waiting for your response.',
      to: '/landlord/inquiries?status=new',
    });
  }
  if (changes) {
    items.push({
      icon: 'edit',
      tone: 'amber',
      title: `${plural(changes, 'listing needs', 'listings need')} changes`,
      text: 'Update the details the administrator asked about.',
      to: '/landlord/properties?status=CHANGES_REQUESTED',
    });
  }
  if (drafts) {
    items.push({
      icon: 'doc',
      tone: 'blue',
      title: `${plural(drafts, 'draft', 'drafts')} not submitted`,
      text: 'Finish them so students can find them.',
      to: '/landlord/properties?status=DRAFT',
    });
  }
  return items;
}

function Attention({ summary }: { summary: LandlordSummary }) {
  const items = attentionItems(summary);
  if (items.length === 0) {
    return (
      <p className="m-0 flex items-center gap-2 text-green-text">
        <Icon name="check" />
        {t("You're all caught up. Nothing needs your attention.")}
      </p>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map(({ icon, tone, title, text, to }) => (
        <li key={to}>
          <Link
            className="flex items-center gap-3 rounded-md border border-line p-3 text-ink no-underline transition-colors hover:border-blue hover:bg-blue-50"
            to={to}
          >
            <IconTile icon={icon} tone={tone} small />
            <span className="flex min-w-0 flex-1 flex-col">
              <b>{tNode(title)}</b>
              <span className="text-sm text-muted">{tNode(text)}</span>
            </span>
            <Icon name="chevR" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuickLink({ to, icon, children }: { to: string; icon: IconName; children: ReactNode }) {
  return (
    <Link
      className="flex min-h-14 items-center gap-3 rounded-md border border-line px-3 text-ink no-underline transition-colors hover:border-blue hover:bg-blue-50"
      to={to}
    >
      <IconTile icon={icon} tone="blue" small />
      <span className="flex-1 font-semibold">{children}</span>
      <Icon name="chevR" />
    </Link>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isError, refetch } = useLandlordSummary();
  const actions = useListingActions();

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load your dashboard. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (!data) {
      return (
        <div
          className="stack"
          role="status"
          aria-busy="true"
          aria-label={t('Loading your dashboard')}
        >
          <div className="grid grid-cols-4 gap-4 max-[1279px]:grid-cols-2 max-phone:grid-cols-1">
            {[1, 2, 3, 4].map((key) => (
              <Skeleton key={key} height={150} />
            ))}
          </div>
          <Skeleton height={320} />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-4 max-[1279px]:grid-cols-2 max-phone:grid-cols-1">
          <StatCard
            to="/landlord/properties"
            label={t('Total properties')}
            value={data.total}
            hint={t('Including drafts')}
            icon="building"
          />
          <StatCard
            to="/landlord/properties?availability=available"
            label={t('Available')}
            value={data.available}
            hint={t('Ready for students')}
            icon="bed"
          />
          <StatCard
            to="/landlord/properties?availability=occupied"
            label={t('Occupied')}
            value={data.occupied}
            hint={t('Currently taken')}
            icon="door"
          />
          <StatCard
            to="/landlord/inquiries?status=new"
            label={t('New inquiries')}
            value={data.newInquiries}
            hint={t('Waiting for your reply')}
            icon="mail"
          />
        </div>
        <Card
          title={t('Recently updated properties')}
          intro={t('Change availability here, or open a listing to edit it.')}
          link={{ to: '/landlord/properties', label: 'All properties' }}
        >
          <RecentProperties
            properties={data.properties}
            onToggle={(property) =>
              void actions.setAvailability(
                property,
                property.availability === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE',
              )
            }
          />
        </Card>
        <div className="grid grid-cols-1 gap-6 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card
            title={t('Recent inquiries')}
            intro={t('The latest messages from students.')}
            link={{ to: '/landlord/inquiries', label: 'All inquiries' }}
          >
            {data.recentInquiries.length ? (
              <div className="flex flex-col gap-1">
                {data.recentInquiries.map((inquiry) => (
                  <InquiryRow key={inquiry.id} inquiry={inquiry} />
                ))}
              </div>
            ) : (
              <p className="muted m-0">
                {t(
                  'No student inquiries yet. When students contact you about your accommodation, their messages will appear here.',
                )}
              </p>
            )}
          </Card>
          <div className="flex min-w-0 flex-col gap-6">
            <Card title={t('Needs your attention')}>
              <Attention summary={data} />
            </Card>
            <Card title={t('Quick actions')}>
              <div className="flex flex-col gap-2">
                <QuickLink to={ADD_PROPERTY} icon="plus">
                  {t('Add a new property')}
                </QuickLink>
                <QuickLink to="/landlord/properties" icon="building">
                  {t('Manage properties')}
                </QuickLink>
                <QuickLink to="/landlord/inquiries" icon="message">
                  {t('Reply to inquiries')}
                </QuickLink>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head items-center!">
        <div>
          <h1 className="t-page">
            {user?.fullName
              ? t('Welcome back, {fullName}', { fullName: user.fullName })
              : t('Welcome back')}
          </h1>
          <p className="muted m-0">
            {t("Here's an overview of your accommodation and recent student activity.")}
          </p>
        </div>
        <Link className={buttonClass()} to={ADD_PROPERTY}>
          <Icon name="plus" />
          {t('Add Property')}
        </Link>
      </div>
      {content()}
    </main>
  );
}
