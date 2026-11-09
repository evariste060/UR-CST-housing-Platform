import { useQueryClient } from '@tanstack/react-query';
import { locationInputSchema, toFieldErrors, type AdminLocation } from '@urcst/shared';
import { useDeferredValue, useState } from 'react';
import { ADMIN_PAGE_SIZE, useAdminLocations } from '../../admin/queries';
import { SearchBox } from '../../admin/Tabs';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import { t, tNode } from '../../i18n';

function useRefreshLocations() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
    ]);
}

/** Add a location, or edit one when `location` is given. */
function LocationForm({ location, onClose }: { location?: AdminLocation; onClose: () => void }) {
  const [name, setName] = useState(location?.name ?? '');
  const [km, setKm] = useState(location ? String(location.distanceKm) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const refresh = useRefreshLocations();

  async function save() {
    const result = locationInputSchema.safeParse({
      name,
      distanceKm: km.trim() === '' ? undefined : km,
    });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setSaving(true);
    try {
      const input = { name: result.data.name, distanceKm: result.data.distanceKm };
      const saved = location
        ? await api.editLocation(location.id, input)
        : await api.addLocation(input);
      await refresh();
      toast(location ? 'Location updated.' : `${saved.name} added.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0)
        setErrors(error.fields);
      else toast(error instanceof Error ? error.message : 'Please try again.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={location ? t('Edit {name}', { name: location.name }) : t('Add location')}
      icon="map"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {location ? t('Save changes') : t('Add location')}
          </Button>
        </>
      }
    >
      <p>{t('Neighbourhoods near UR-CST that landlords can choose.')}</p>
      <div className="flex flex-col gap-4 text-ink">
        <Field
          id="loc-name"
          label={t('Location name')}
          value={name}
          onChange={setName}
          placeholder={t('e.g. Rugenge')}
          required
          error={errors.name}
        />
        <Field
          id="loc-km"
          label={t('Approximate distance from UR-CST (km)')}
          value={km}
          onChange={setKm}
          inputMode="decimal"
          placeholder="e.g. 1.5"
          help={t('The pilot covers areas up to 5 km from campus.')}
          required
          error={errors.distanceKm}
        />
      </div>
    </Modal>
  );
}

export function AdminLocationsPage() {
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const { data, isError, refetch } = useAdminLocations(q, page);
  const [editing, setEditing] = useState<AdminLocation | 'new' | null>(null);
  const [removing, setRemoving] = useState<AdminLocation | null>(null);
  const toast = useToast();
  const refresh = useRefreshLocations();

  async function remove(location: AdminLocation) {
    try {
      await api.removeLocation(location.id);
      await refresh();
      toast(t('{name} removed.', { name: location.name }), {
        undo: () =>
          void api
            .addLocation({
              name: location.name,
              distanceKm: location.distanceKm,
              angleDeg: location.angleDeg,
            })
            .then(refresh)
            .then(() => toast(t('{name} is back.', { name: location.name }), { type: 'info' }))
            .catch(() => toast('We could not bring it back. Add it again.', { type: 'error' })),
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Please try again.', { type: 'error' });
    }
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load locations.')}
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
        <div role="status" aria-busy="true" aria-label={t('Loading locations')}>
          <Skeleton height={240} />
        </div>
      );
    }
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon="map"
          title={t('No locations match')}
          text={t('Try another name.')}
          actions={
            <Button variant="secondary" onClick={() => setSearch('')}>
              {t('Clear search')}
            </Button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-line bg-card">
          <table className="w-full border-collapse max-phone:block">
            <caption className="sr-only">{t('Supported locations')}</caption>
            <thead className="bg-surface text-left max-phone:hidden">
              <tr className="[&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:text-muted">
                <th scope="col">{t('Location name')}</th>
                <th scope="col">{t('Distance')}</th>
                <th scope="col">{t('Listings')}</th>
                <th scope="col">
                  <span className="sr-only">{t('Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="max-phone:block">
              {data.items.map((location) => (
                <tr
                  key={location.id}
                  className="border-t border-line max-phone:flex max-phone:flex-wrap max-phone:gap-x-4 max-phone:gap-y-2 max-phone:p-4 [&_td]:px-4 [&_td]:py-3 max-phone:[&_td]:p-0"
                >
                  <td className="max-phone:w-full">
                    <b>{tNode(location.name)}</b>
                  </td>
                  <td className="num whitespace-nowrap">
                    {location.distanceKm.toFixed(1)} {t('km')}
                  </td>
                  <td className="num">
                    {tNode(location.listings)}
                    <span className="text-muted phone:hidden">
                      {location.listings === 1 ? t(' listing') : t(' listings')}
                    </span>
                  </td>
                  <td className="max-phone:w-full">
                    <span className="flex flex-wrap justify-end gap-2 max-phone:justify-start">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="edit"
                        aria-label={t('Edit {name}', { name: location.name })}
                        onClick={() => setEditing(location)}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-outline"
                        icon="trash"
                        aria-label={t('Remove {name}', { name: location.name })}
                        onClick={() => setRemoving(location)}
                      >
                        {t('Remove')}
                      </Button>
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
            noun={t('locations')}
            label={t('Location pages')}
            onChange={setPage}
          />
        )}
      </div>
    );
  }

  const inUse = removing && removing.listings > 0;

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Location management')}</h1>
          <p className="muted m-0">
            {t(
              'Neighbourhoods landlords can choose. The pilot covers areas within about 5 km of UR-CST.',
            )}
          </p>
        </div>
        <Button icon="plus" onClick={() => setEditing('new')}>
          {t('Add location')}
        </Button>
      </div>
      <div className="mb-4 max-w-[420px]">
        <SearchBox
          id="loc-q"
          label={t('Search locations')}
          value={search}
          placeholder={t('Search locations')}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>
      {content()}
      {editing && (
        <LocationForm
          location={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && inUse && (
        <Modal
          title={t('{name} is still in use', { name: removing.name })}
          icon="alert"
          onClose={() => setRemoving(null)}
          footer={
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              {t('OK')}
            </Button>
          }
        >
          <p>
            {tNode(removing.listings)}{' '}
            {removing.listings === 1 ? t('listing uses') : t('listings use')}{' '}
            {t('this location. Ask landlords to move')} {removing.listings === 1 ? 'it' : 'them'}{' '}
            {t('to another neighbourhood first, so no listing is left without a location.')}
          </p>
        </Modal>
      )}
      {removing && !inUse && (
        <ConfirmDialog
          title={t('Remove {name}?', { name: removing.name })}
          body={t('Landlords will no longer be able to choose this neighbourhood.')}
          confirm={t('Remove location')}
          tone="danger"
          icon="trash"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const location = removing;
            setRemoving(null);
            void remove(location);
          }}
        />
      )}
    </main>
  );
}
