import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { json, renderRoute, sentBody, stubApi } from '../test/render';
import { SAVED_KEY } from './storage';

const student = {
  id: 'u1',
  email: 'student@demo.ur',
  fullName: 'Demo Student',
  phone: null,
  role: 'STUDENT' as const,
};

describe('a guest list', () => {
  it('moves into the account after logging in', async () => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(['p1', 'p2']));
    const fetchMock = stubApi(
      () => json({ ids: ['p1', 'p2'], items: [], views: [], searches: [], total: 0 }),
      student,
    );

    renderRoute('/student');

    await waitFor(() => expect(localStorage.getItem(SAVED_KEY)).toBeNull());
    expect(JSON.stringify(sentBody(fetchMock, '/me/saved/merge'))).toContain('p1');
  });
});
