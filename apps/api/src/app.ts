import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppError, errorHandler } from './lib/errors';
import { consoleMailer, type Mailer } from './lib/mailer';
import { localStorage, type Storage } from './lib/storage';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { landlordRouter } from './routes/landlord';
import { locationsRouter } from './routes/locations';
import { meRouter } from './routes/me';
import { notificationsRouter } from './routes/notifications';
import { propertiesRouter } from './routes/properties';
import { searchRouter } from './routes/search';
import { studentRouter } from './routes/student';
import { supportRouter } from './routes/support';

const UPLOADS_DIR = fileURLToPath(new URL('../uploads', import.meta.url));

interface AppOptions {
  mailer?: Mailer;
  storage?: Storage;
}

export function createApp({
  mailer = consoleMailer,
  storage = localStorage(UPLOADS_DIR),
}: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter(mailer));
  app.use('/api/me', meRouter);
  app.use('/api/me', studentRouter);
  app.use('/api/properties', propertiesRouter());
  app.use('/api/landlord', landlordRouter(storage));
  app.use('/api/locations', locationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter());
  app.use('/api/support', supportRouter(mailer));
  app.use('/uploads', express.static(UPLOADS_DIR, { index: false }));

  app.use(() => {
    throw new AppError(404, 'NOT_FOUND', 'We could not find that page.');
  });

  app.use(errorHandler);

  return app;
}
