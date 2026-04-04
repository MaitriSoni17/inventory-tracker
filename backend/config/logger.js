const winston = require('winston');
const { randomUUID } = require('crypto');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'inventory-api' },
  transports: [
    // Error logs to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // All logs to combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ]
});

// In development, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} [${info.level}] ${info.message}`
        )
      )
    })
  );
}

// Middleware to attach request ID and log requests
function requestLogger(req, res, next) {
  req.id = randomUUID();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });
  });

  next();
}

module.exports = { logger, requestLogger };
