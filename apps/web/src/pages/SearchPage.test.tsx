import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { json, renderRoute, stubApi } from '../test/render';

const room = {
  id: 'p1',
  title: 'Sunny room near campus',
  area: 'Kiyovu',
  landmark: 'UR-CST gate',
  type: 'SINGLE',
  rooms: 1,
  selfContained: true,
  rentRwf: 90_000,
  distanceKm: 1.2,
  availability: 'AVAILABLE',
  reviewStatus: 'APPROVED',
  water: true,
  electricity: true,
  bathroom: 'PRIVATE',
  security: true,
  coverUrl: null,
};

/** Answers like the API: nothing matches a budget under 100,000. */
function stubSearch() {
  return stubApi((path) => {
    if (path.startsWith('/locations')) return json({ items: [] });
    const params = new URLSearchParams(path.split('?')[1]);
    const items = Number(params.get('maxRent') ?? Infinity) < 100_000 ? [] : [room];
    return json({ items, total: items.length, page: 1, pageSize: 20 });
  });
}

describe('SearchPage', () => {
  beforeEach(() => localStorage.clear());

  it('reads the filters from the address and shows the count', async () => {
    stubSearch();
    renderRoute('/search?maxRent=100000');

    expect(await screen.findByText('1 place matches your search')).toBeInTheDocument();
    expect(screen.getByText('Max 100,000 RWF')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: room.title })).toBeInTheDocument();
  });

  it('removes a filter from its chip', async () => {
    stubSearch();
    renderRoute('/search?maxRent=70000');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove filter Max 70,000 RWF' }),
    );

    expect(await screen.findByText('1 place matches your search')).toBeInTheDocument();
  });

  it('changes the results from the empty state', async () => {
    stubSearch();
    renderRoute('/search?maxRent=70000');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Increase budget to 100,000 RWF' }),
    );

    expect(await screen.findByText('1 place matches your search')).toBeInTheDocument();
    expect(screen.getByText('Budget increased to 100,000 RWF.')).toBeInTheDocument();
  });
});
