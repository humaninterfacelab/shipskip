const SAFE_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "TMPDIR",
  "TMP",
  "TEMP",
  "BUN_INSTALL",
] as const;

export function createSafeExecutionEnv() {
  const env: Record<string, string> = {};

  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];

    if (value) {
      env[key] = value;
    }
  }

  env.CI = process.env.CI ?? "1";
  env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED ?? "1";
  env.npm_config_yes = process.env.npm_config_yes ?? "true";

  return env;
}
