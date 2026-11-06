import { execSync } from 'node:child_process';
import { assertTestDatabase, TEST_DATABASE_URL } from './testDatabase';

export default function setup() {
  assertTestDatabase(TEST_DATABASE_URL);

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(`Could not prepare the test database. Is Docker running?\n${output}`);
  }
}
