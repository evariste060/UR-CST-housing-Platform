import {
  REPORT_REASON_LABELS,
  reportStatusFilterSchema,
  type AdminReport,
  type ReportStatusFilter,
} from '@urcst/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminReviewBadge, useModeration } from '../../admin/Moderation';
import { ADMIN_PAGE_SIZE, useAdminAction, useAdminReports } from '../../admin/queries';
import { CountTabs } from '../../admin/Tabs';
import { Badge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { api } from '../../lib/api';
import { formatDate, formatRwf } from '../../lib/format';
import { t, tNode } from '../../i18n';

const TABS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

function ReportStatus({ status }: { status: AdminReport['status'] }) {
  return status === 'OPEN' ? (
    <Badge tone="pending" icon="clock">
      {t('Open')}
    </Badge>
  ) : (
    <Badge tone="available" icon="check">
      {t('Resolved')}
    </Badge>
  );
}

function ReportDetails({ report, onClose }: { report: AdminReport; onClose: () => void }) {
  const { property } = report;
  return (
    <Modal
      wide
      title={t('Report: {title}', { title: property.title })}
      icon="flag"
      onClose={onClose}
      footer={
        <>
          <Link
            className={buttonClass({ variant: 'secondary' })}
            to={`/admin/review/${property.id}`}
          >
            {t('Inspect listing')}
          </Link>
          <Button variant="secondary" onClick={onClose}>
            {t('Close')}
          </Button>
        </>
      }
    >
      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-ink [&_dt]:font-semibold [&_dt]:text-muted">
        <dt>{t('Reason')}</dt>
        <dd className="m-0">{tNode(REPORT_REASON_LABELS[report.reason])}</dd>
        <dt>{t('Reported by')}</dt>
        <dd className="m-0">{tNode(report.reporter)}</dd>
        <dt>{t('Date')}</dt>
        <dd className="m-0">{tNode(formatDate(report.createdAt))}</dd>
        <dt>{t('Status')}</dt>
        <dd className="m-0">{report.status === 'OPEN' ? t('Open') : t('Resolved')}</dd>
      </dl>
      <div className="mt-4 rounded-md bg-surface p-4 text-ink">
        <b>{t('Details')}</b>
        <p className="mt-1 mb-0">{report.details || t('No details were given.')}</p>
      </div>
      {report.resolutionNote && (
        <p className="text-ink">
          <b>{t('Resolution:')}</b> {tNode(report.resolutionNote)}
        </p>
      )}
      <p className="text-ink">
        {t('Listed details:')} {formatRwf(property.rentRwf)} {t('· water')}{' '}
        {property.water ? 'yes' : 'no'} {t('· electricity')} {property.electricity ? 'yes' : 'no'} ·{' '}
        {tNode(property.photoCount)} {property.photoCount === 1 ? 'photo' : 'photos'}.
      </p>
    </Modal>
  );
}

export function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = reportStatusFilterSchema.safeParse(params.get('status'));
  const tab = parsed.success ? parsed.data : 'OPEN';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isError, refetch } = useAdminReports(tab, page);
  const [viewing, setViewing] = useState<AdminReport | null>(null);
  const [resolving, setResolving] = useState<AdminReport | null>(null);
  const moderation = useModeration();
  const resolve = useAdminAction(({ id, note }: { id: string; note: string }) =>
    api.resolveReport(id, note),
  );

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load reports.')}
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
        <div role="status" aria-busy="true" aria-label={t('Loading reports')}>
          <Skeleton height={240} />
        </div>
      );
    }
    if (data.items.length === 0) {
      return tab === 'OPEN' ? (
        <EmptyState
          icon="flag"
          title={t('No open reports')}
          text={t('Every report has been handled.')}
        />
      ) : (
        <EmptyState
          icon="flag"
          title={t('No resolved reports yet')}
          text={t('Resolved reports appear here.')}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <ul
          className="m-0 list-none overflow-hidden rounded-lg border border-line bg-card p-0"
          aria-label={t('{p0} reports', { p0: tab === 'OPEN' ? 'Open' : 'Resolved' })}
        >
          {data.items.map((report) => {
            const { property } = report;
            return (
              <li
                key={report.id}
                className="list-item flex! flex-wrap items-center gap-4! border-0! border-b! border-solid border-line p-4! last:border-b-0!"
              >
                <span className="grid size-12 flex-none place-items-center rounded-md bg-red-50 text-red-text">
                  <Icon name="flag" />
                </span>
                <span className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <b>{tNode(property.title)}</b>
                  <span className="text-sm text-muted">
                    {tNode(REPORT_REASON_LABELS[report.reason])} ·{' '}
                    {tNode(formatDate(report.createdAt))} {t('· by')} {tNode(report.reporter)}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <ReportStatus status={report.status} />
                    <AdminReviewBadge status={property.reviewStatus} />
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t('View report on {title}', { title: property.title })}
                    onClick={() => setViewing(report)}
                  >
                    {t('View report')}
                  </Button>
                  <Link
                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                    to={`/admin/review/${property.id}`}
                    aria-label={t('Inspect listing {title}', { title: property.title })}
                  >
                    {t('Inspect listing')}
                  </Link>
                  {report.status === 'OPEN' && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        icon="check"
                        aria-label={t('Resolve the report on {title}', { title: property.title })}
                        onClick={() => setResolving(report)}
                      >
                        {t('Resolve')}
                      </Button>
                      {property.reviewStatus === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          icon="trash"
                          aria-label={t('Remove listing {title}', { title: property.title })}
                          onClick={() =>
                            moderation.ask('remove', {
                              id: property.id,
                              title: property.title,
                              reportId: report.id,
                            })
                          }
                        >
                          {t('Remove listing')}
                        </Button>
                      )}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {data.total > ADMIN_PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={data.total}
            noun={t('reports')}
            label={t('Report pages')}
            onChange={(next) => setParams({ status: tab, page: String(next) })}
          />
        )}
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Reported properties')}</h1>
          <p className="muted m-0">
            {t('Reports from students about wrong or misleading listings.')}
          </p>
        </div>
      </div>
      <div className="mb-4">
        <CountTabs
          label={t('Report status')}
          value={tab}
          options={TABS}
          counts={data?.counts}
          onChange={(value) => setParams(value === 'OPEN' ? {} : { status: value })}
        />
      </div>
      {content()}
      {viewing && <ReportDetails report={viewing} onClose={() => setViewing(null)} />}
      {resolving && (
        <ConfirmDialog
          title={t('Resolve this report?')}
          body={t(
            'Use this when the listing is correct or the landlord has fixed it. The listing stays visible.',
          )}
          confirm={t('Resolve report')}
          tone="success"
          icon="check"
          field={{
            label: 'Resolution note',
            placeholder: 'e.g. Landlord updated the listing: electricity is prepaid.',
            required: 'Please add a short note.',
          }}
          onCancel={() => setResolving(null)}
          onConfirm={(note) => {
            const { id } = resolving;
            setResolving(null);
            resolve({ id, note }, 'Report resolved.');
          }}
        />
      )}
      {tNode(moderation.dialog)}
    </main>
  );
}
