const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const isDevelopment = process.env.NODE_ENV !== 'production';

const isLocalRequest = (req) => {
  const ip = String(req.ip || req.connection?.remoteAddress || '');
  const forwardedFor = String(req.headers['x-forwarded-for'] || '');
  const source = `${ip},${forwardedFor}`;
  return source.includes('127.0.0.1') || source.includes('::1') || source.includes('localhost');
};

// Security headers via helmet
function securityHeaders(app) {
  app.use(helmet({
    // Frontend runs on a different origin in development (3000 -> 5000)
    // and needs to load /uploads image assets.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  
  // Additional custom security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// CORS configuration
function corsConfig() {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000', 'http://localhost:5000'];
  
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'auth-token']
  });
}

// Rate limiting - general API limit
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 1000 : 100),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.user?.role === 'admin') return true;
    if (req.path === '/health') return true;
    if (isDevelopment && isLocalRequest(req)) return true;
    return false;
  }
});

// Stricter limit for auth endpoints (login, signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting for sensitive operations (delete, permissions changes)
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many sensitive operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  securityHeaders,
  corsConfig,
  generalLimiter,
  authLimiter,
  sensitiveOpLimiter
};
