import express, { type NextFunction, type Request, type Response } from 'express';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/health', healthRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'We could not find that page.' },
    });
  });

  // Express treats a four-argument function as the error handler, so `_next` must stay.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      },
    });
  });

  return app;
}
