import { userRoleFilterSchema, type AdminUser, type UserRoleFilter } from '@urcst/shared';
import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADMIN_PAGE_SIZE, useAdminAction, useAdminUser, useAdminUsers } from '../../admin/queries';
import { CountTabs, SearchBox } from '../../admin/Tabs';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { t, tNode } from '../../i18n';

const ROLES: { value: UserRoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'student', label: 'Students' },
  { value: 'landlord', label: 'Landlords' },
];

const roleLabel = (role: AdminUser['role']) => (role === 'STUDENT' ? 'Student' : 'Landlord');

function StatusBadge({ status }: { status: AdminUser['status'] }) {
  return status === 'ACTIVE' ? (
    <Badge tone="available" icon="check">
      {t('Active')}
    </Badge>
  ) : (
    <Badge tone="suspended" icon="lock">
      {t('Suspended')}
    </Badge>
  );
}

function UserDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isError } = useAdminUser(id);
  return (
    <Modal
      title={data?.fullName ?? t('Account details')}
      icon="user"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('Close')}
        </Button>
      }
    >
      {isError ? (
        <p>{t('Unable to load this account. Please try again.')}</p>
      ) : !data ? (
        <p role="status">{t('Loading…')}</p>
      ) : (
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-ink [&_dt]:font-semibold [&_dt]:text-muted">
          <dt>{t('Role')}</dt>
          <dd className="m-0">{tNode(roleLabel(data.role))}</dd>
          <dt>{t('Email')}</dt>
          <dd className="m-0 break-all">{data.email}</dd>
          <dt>{t('Phone')}</dt>
          <dd className="m-0">{data.phone ?? t('Not given')}</dd>
          <dt>{t('Registered')}</dt>
          <dd className="m-0">{tNode(formatDate(data.createdAt))}</dd>
          <dt>{t('Status')}</dt>
          <dd className="m-0">{data.status === 'ACTIVE' ? t('Active') : t('Suspended')}</dd>
          <dt>{data.role === 'LANDLORD' ? t('Listings') : t('Inquiries sent')}</dt>
          <dd className="num m-0">{data.count}</dd>
        </dl>
      )}
    </Modal>
  );
}

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const parsed = userRoleFilterSchema.safeParse(params.get('role'));
  const role = parsed.success ? parsed.data : 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const { data, isError, refetch } = useAdminUsers(role, q, page);
  const [viewing, setViewing] = useState<string | null>(null);
  const [changing, setChanging] = useState<AdminUser | null>(null);
  const setStatus = useAdminAction(({ id, status }: { id: string; status: AdminUser['status'] }) =>
    api.setUserStatus(id, status),
  );

  function pick(next: UserRoleFilter) {
    setParams(next === 'all' ? {} : { role: next });
  }

  function clear() {
    setSearch('');
    setParams({});
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load accounts.')}
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
        <div role="status" aria-busy="true" aria-label={t('Loading accounts')}>
          <Skeleton height={240} />
        </div>
      );
    }
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon="users"
          title={t('No users match')}
          text={t('Try a different name or clear the search.')}
          actions={
            <Button variant="secondary" onClick={clear}>
              {t('Clear search')}
            </Button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-line bg-card">
          <table className="w-full border-collapse max-tablet:block">
            <caption className="sr-only">{t('Accounts')}</caption>
            <thead className="bg-surface text-left max-tablet:hidden">
              <tr className="[&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:text-muted">
                <th scope="col">{t('Name')}</th>
                <th scope="col">{t('Role')}</th>
                <th scope="col">{t('Registered')}</th>
                <th scope="col">{t('Status')}</th>
                <th scope="col">
                  <span className="sr-only">{t('Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="max-tablet:block">
              {data.items.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-line max-tablet:flex max-tablet:flex-wrap max-tablet:gap-x-4 max-tablet:gap-y-2 max-tablet:p-4 [&_td]:px-4 [&_td]:py-3 max-tablet:[&_td]:p-0"
                >
                  <td className="max-tablet:w-full">
                    <b className="block">{user.fullName}</b>
                    <span className="text-sm break-all text-muted">{user.email}</span>
                  </td>
                  <td>{tNode(roleLabel(user.role))}</td>
                  <td className="num">
                    <span className="text-muted tablet:hidden">{t('Registered')} </span>
                    {tNode(formatDate(user.createdAt))}
                  </td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="max-tablet:w-full">
                    <span className="flex flex-wrap justify-end gap-2 max-tablet:justify-start">
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={t('View details of {fullName}', { fullName: user.fullName })}
                        onClick={() => setViewing(user.id)}
                      >
                        {t('View details')}
                      </Button>
                      {user.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="danger-outline"
                          icon="lock"
                          aria-label={t('Suspend {fullName}', { fullName: user.fullName })}
                          onClick={() => setChanging(user)}
                        >
                          {t('Suspend')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="check"
                          aria-label={t('Reactivate {fullName}', { fullName: user.fullName })}
                          onClick={() => setChanging(user)}
                        >
                          {t('Reactivate')}
                        </Button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.total > ADMIN_PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={data.total}
            noun={t('accounts')}
            label={t('Account pages')}
            onChange={(next) => setParams({ ...(role !== 'all' && { role }), page: String(next) })}
          />
        )}
      </div>
    );
  }

  const suspending = changing?.status === 'ACTIVE';

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('User management')}</h1>
          <p className="muted m-0">
            {t('Search accounts and manage access. Administrator accounts are not listed.')}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          id="u-q"
          label={t('Search users')}
          value={search}
          placeholder={t('Search by name or email')}
          onChange={(value) => {
            setSearch(value);
            if (page !== 1) setParams(role === 'all' ? {} : { role });
          }}
        />
        <CountTabs label={t('Filter by role')} value={role} options={ROLES} onChange={pick} />
      </div>
      {data && (
        <p className="t-support num mb-3" aria-live="polite">
          {data.total} {data.total === 1 ? 'account' : 'accounts'}
        </p>
      )}
      {content()}
      {viewing && <UserDetails id={viewing} onClose={() => setViewing(null)} />}
      {changing && (
        <ConfirmDialog
          title={`${suspending ? t('Suspend') : t('Reactivate')} ${changing.fullName}?`}
          body={
            suspending
              ? t(
                  'They will not be able to log in. Their listings and messages stay saved. You can reactivate the account later.',
                )
              : t('They will be able to log in again.')
          }
          confirm={suspending ? t('Suspend account') : t('Reactivate account')}
          tone={suspending ? 'danger' : 'primary'}
          icon={suspending ? 'lock' : 'check'}
          onCancel={() => setChanging(null)}
          onConfirm={() => {
            const { id } = changing;
            setChanging(null);
            setStatus(
              { id, status: suspending ? 'SUSPENDED' : 'ACTIVE' },
              suspending ? 'Account suspended.' : 'Account reactivated.',
            );
          }}
        />
      )}
    </main>
  );
}
