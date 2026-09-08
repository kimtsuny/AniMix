import "dotenv/config";

/**
 * Validated environment variables used throughout the application.
 * Fails fast at startup if required variables are missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  PORT: parseInt(process.env.PORT || "5000", 10),
} as const;
