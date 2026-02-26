// src/app.js
import 'dotenv/config';                        // <-- ensure env is loaded first

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import RefParser from '@apidevtools/json-schema-ref-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { makeSessionMiddleware } from './config/session.js';

import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import requestId from './middleware/requestID.js';
import { apiLimiter } from './middleware/rateLimit.js';
import timeoutMw from './middleware/timeout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const API_PREFIX       = process.env.API_PREFIX || '/api/v1';
const ENABLE_HSTS      = process.env.ENABLE_HSTS === 'true';
const RAW_ORIGINS      = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const CORS_CREDENTIALS = process.env.CORS_CREDENTIALS === 'true';

// ---------------- Core & Security (order matters)
app.disable('x-powered-by');

// Always behind nginx → required for secure cookies
app.set('trust proxy', 1);

app.use(requestId);
app.use(timeoutMw);

app.use(
  helmet({
    hsts: ENABLE_HSTS,
    contentSecurityPolicy: false
  })
);

// Strict global CSP
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src":  ["'self'"],
      "style-src":   ["'self'"],
      "img-src":     ["'self'"],
      "font-src":    ["'self'"],
      "object-src":  ["'none'"],
      "base-uri":    ["'self'"],
      "frame-ancestors": ["'self'"],
      upgradeInsecureRequests: null
    }
  })
);

// ---------------- CORS
const allowAll = RAW_ORIGINS.length === 1 && RAW_ORIGINS[0] === '*';
const allowedSet = new Set(RAW_ORIGINS);

console.log('CORS allow-list:', [...allowedSet]);
console.log('CORS credentials enabled:', CORS_CREDENTIALS);

const corsOptions = {
  credentials: CORS_CREDENTIALS,
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    if (allowAll && !CORS_CREDENTIALS) {
      return cb(null, true);
    }

    if (allowedSet.has(origin)) {
      return cb(null, true);
    }

    console.warn('CORS blocked:', origin);
    return cb(null, false);
  }
};

app.use(cors(corsOptions));
app.use(express.json());

/**
 * -------------------------------------------------
 * Serve Uploaded Media (Public)
 * -------------------------------------------------
 * Physical path:
 *   src/uploads/installations/{id}/file.ext
 *
 * Public URL:
 *   /media/installations/{id}/file.ext
 */
app.use(
  '/media',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    etag: true,
    index: false
  })
);

// ---------------- Sessions
app.use(makeSessionMiddleware());

// ---------------- Logging
morgan.token('reqid', (req) => req.id);
app.use(morgan(':method :url :status - reqid=:reqid :response-time ms'));

// ---------------- Health
app.get(`${API_PREFIX}/healthz`, (_req, res) =>
  res.status(200).type('text/plain').send('ok')
);

// ---------------- Swagger
const openapiYamlPath = path.join(__dirname, 'docs', 'openapi.yaml');

let cachedSpec = null;
async function loadOpenApiSpec() {
  if (process.env.NODE_ENV !== 'development' && cachedSpec) return cachedSpec;
  cachedSpec = await RefParser.bundle(openapiYamlPath);
  return cachedSpec;
}

app.get('/docs-json', async (_req, res, next) => {
  try {
    const spec = await loadOpenApiSpec();
    if (!spec?.openapi) throw new Error('Bundled spec missing "openapi" field');
    res.json(spec);
  } catch (e) {
    console.error('[OpenAPI bundle error]', e?.message || e);
    next(e);
  }
});

app.use(
  '/docs',
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src":  ["'self'", "'unsafe-inline'"],
      "style-src":   ["'self'", "'unsafe-inline'"],
      "img-src":     ["'self'", "data:"],
      "font-src":    ["'self'", "https:", "data:"],
      "object-src":  ["'none'"],
      "base-uri":    ["'self'"],
      "frame-ancestors": ["'self'"],
      upgradeInsecureRequests: null
    }
  }),
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    explorer: true,
    customSiteTitle: 'API Docs',
    swaggerOptions: { url: '/docs-json' }
  })
);

// ---------------- Versioned API
console.log('[BOOT] API_PREFIX =', API_PREFIX);
app.use(API_PREFIX, apiLimiter, routes);

// ---------------- Root
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    docs: '/docs',
    spec: '/docs-json',
    api: API_PREFIX
  });
});

// ---------------- 404 & Errors
app.use((req, res) =>
  res.status(404).json({ error: 'not_found', path: req.originalUrl })
);

app.use(errorHandler);

export default app;
