export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://urcst:urcst_dev@localhost:5433/urcst_housing_test?schema=public';

/** Stops the tests from ever clearing the development database. */
export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.slice(1);

  if (!name.endsWith('_test')) {
    throw new Error(`Tests only run on a database whose name ends in _test, not "${name}".`);
  }
}
