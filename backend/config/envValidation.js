// Environment validation module - fail fast if critical configs are missing
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PORT'
];

const optionalEnvVars = {
  'NODE_ENV': 'development',
  'LOG_LEVEL': 'info',
  'RATE_LIMIT_WINDOW_MS': '900000', // 15 minutes
  'RATE_LIMIT_MAX_REQUESTS': '100',
  'JWT_EXPIRES_IN': '8h'
};

function validateEnv() {
  const missing = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n`
    );
    process.exit(1);
  }

  // Set optional defaults
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });

//   console.log('✅ Environment validation passed');
  return true;
}

module.exports = { validateEnv };
