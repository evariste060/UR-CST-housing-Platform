import { createApp } from './app';
import { prisma } from './db';
import { env } from './env';

try {
  // Connecting first takes about 2 seconds, so the first login does not have to wait for it.
  await prisma.$connect();
} catch {
  console.error('Could not reach the database. Start it with: docker compose up -d db');
}

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
