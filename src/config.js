export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || 3000,
    vitalsDb: env.VITALS_DB || '/app/data/vitals.db',
    mountPrefix: env.MOUNT_PREFIX || '',
    nodeEnv: env.NODE_ENV || 'development',
  };
}
