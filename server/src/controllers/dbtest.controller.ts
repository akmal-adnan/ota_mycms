import mongoose from 'mongoose';
import { Request, Response } from 'express';

export const dbTest = async (_req: Request, res: Response) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const states: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    if (mongoState === 1 && mongoose.connection.db) {
      // Connection is active, verify with a ping
      const admin = mongoose.connection.db.admin();
      const pingResult = await admin.ping();
      return res.json({
        status: 'ok',
        database: 'connected',
        connectionState: states[mongoState],
        ping: pingResult,
      });
    } else {
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        connectionState: states[mongoState],
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({
      status: 'error',
      database: 'error',
      error: errorMessage,
    });
  }
};
