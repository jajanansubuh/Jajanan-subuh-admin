declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    DATABASE_URL?: string;
    DEBUG_SECRET?: string;
    PORT?: string;
  }
}

export {};
