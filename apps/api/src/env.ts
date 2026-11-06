import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string({ error: 'Copy apps/api/.env.example to apps/api/.env.' }).min(1),
  JWT_SECRET: z
    .string({ error: 'Copy apps/api/.env.example to apps/api/.env.' })
    .min(32, 'Use at least 32 random characters.'),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const problems = result.error.issues.map(
    (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`The API settings are not valid:\n${problems.join('\n')}`);
}

export const env = result.data;
