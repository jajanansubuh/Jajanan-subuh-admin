declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      DATABASE_URL?: string;
      DEBUG_SECRET?: string;
      JWT_SECRET?: string;
      PORT?: string;
    }
  }
}

export {};
