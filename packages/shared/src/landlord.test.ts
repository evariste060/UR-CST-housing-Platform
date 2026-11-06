import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, NO_PHOTOS_MESSAGE, listingErrors, stepErrors } from './landlord';

const complete = {
  ...EMPTY_DRAFT,
  title: 'Sunny room',
  type: 'SINGLE' as const,
  description: 'A bright room close to campus with water included.',
  locationId: 'l1',
  landmark: 'Main road',
  rentRwf: 80000,
};

describe('stepErrors', () => {
  it('lists what is missing on the first step', () => {
    expect(stepErrors(1, EMPTY_DRAFT, 0)).toEqual({
      title: 'Please enter a property title.',
      type: 'Please choose the accommodation type.',
      description: 'Please write at least 30 characters (now 0).',
    });
  });

  it('keeps rent inside the allowed range', () => {
    expect(stepErrors(3, { ...complete, rentRwf: 5000 }, 1).rentRwf).toBe(
      'Enter an amount between 10,000 and 1,000,000 RWF.',
    );
  });

  it('asks for a photo on the photos step', () => {
    expect(stepErrors(4, complete, 0)).toEqual({ photos: NO_PHOTOS_MESSAGE });
  });
});

describe('listingErrors', () => {
  it('passes a complete listing with a photo', () => {
    expect(listingErrors(complete, 1)).toEqual({});
  });

  it('collects errors across steps', () => {
    expect(Object.keys(listingErrors({ ...complete, title: '', landmark: '' }, 0))).toEqual([
      'title',
      'landmark',
      'photos',
    ]);
  });
});
