import cookieParser from 'cookie-parser';
import express from 'express';
import { AppError, errorHandler } from './lib/errors';
import { consoleMailer, type Mailer } from './lib/mailer';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { meRouter } from './routes/me';

interface AppOptions {
  mailer?: Mailer;
}

export function createApp({ mailer = consoleMailer }: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter(mailer));
  app.use('/api/me', meRouter);

  app.use(() => {
    throw new AppError(404, 'NOT_FOUND', 'We could not find that page.');
  });

  app.use(errorHandler);

  return app;
}
