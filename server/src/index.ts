import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import pinoHttp from 'pino-http';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import bundleGroupRoutes from './routes/bundleGroup.routes';
import updatesRoutes from './routes/updates.routes';
import { errorHandler } from './middleware/errorHandler';
import { dbTest } from './controllers/dbtest.controller';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : (true as const),
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// needed for local storage
if (env.STORAGE_TYPE === 'local') {
  app.use('/uploads', express.static(path.resolve(env.LOCAL_STORAGE_DIR)));
}

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', dbTest);

app.use('/api/auth', authRoutes);
app.use('/api/bundle-groups', bundleGroupRoutes);
app.use('/api/updates', updatesRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
