declare global {
  namespace Express {
    interface Request {
      admin?: { userId: string; email: string; projectId?: string };
    }
  }
}

export {};
