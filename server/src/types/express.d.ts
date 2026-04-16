declare global {
  namespace Express {
    interface Request {
      admin?: { userId: string; email: string };
    }
  }
}

export {};
