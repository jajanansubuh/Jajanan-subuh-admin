declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    DEBUG_SECRET?: string;
    JWT_SECRET?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    // add other environment vars used in the app here
  }
}
