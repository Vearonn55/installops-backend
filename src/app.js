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

const API_PREFIX        = process.env.API_PREFIX || '/api/v1';
const ENABLE_HSTS       = process.env.ENABLE_HSTS === 'true';     // set true only when HTTPS is active
const TRUST_PROXY       = process.env.TRUST_PROXY === 'true';     // set true if behind nginx/elb
const RAW_ORIGINS       = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean);
const CORS_CREDENTIALS  = process.env.CORS_CREDENTIALS === 'true';

// ---------------- Core & Security (order matters)
app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', 1); // needed for secure cookies behind proxy

app.use(requestId);     // req.id for logs / tracing
app.use(timeoutMw);     // per-req/res timeouts

// Base Helmet. Keep CSP route-scoped; HSTS only when HTTPS is active.
app.use(helmet({ hsts: ENABLE_HSTS, contentSecurityPolicy: false }));

// Strict global CSP (no auto-upgrade to https while developing over http)
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
      // IMPORTANT: don't force http→https upgrades during local http
      upgradeInsecureRequests: null
    }
  })
);

// ---- CORS (sessions need credentials when cross-origin) ----
// If credentials=true, we cannot use wildcard "*". Use an allow-list instead.
const allowAll = RAW_ORIGINS.length === 1 && RAW_ORIGINS[0] === '*';
const allowedSet = new Set(RAW_ORIGINS);

const corsOptions = {
  credentials: CORS_CREDENTIALS,
  origin: (origin, cb) => {
    // Same-origin / curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);

    if (CORS_CREDENTIALS) {
      // With credentials, origin must be explicitly allowed
      if (!allowAll && allowedSet.has(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed with credentials'), false);
    }

    // Without credentials, allow-list or wildcard
    if (allowAll || allowedSet.has(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'), false);
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Sessions (MemoryStore or your configured store)
app.use(makeSessionMiddleware());

// Request logging with request id token
morgan.token('reqid', (req) => req.id);
app.use(morgan(':method :url :status - reqid=:reqid :response-time ms'));

// ---------------- Health (fast, dependency-free)
app.get('/healthz', (_req, res) => res.status(200).type('text/plain').send('ok'));

// ---------------- Swagger (YAML + $ref bundling → served as JSON)
const openapiYamlPath = path.join(__dirname, 'docs', 'openapi.yaml');

let cachedSpec = null;
async function loadOpenApiSpec() {
  if (process.env.NODE_ENV !== 'development' && cachedSpec) return cachedSpec;
  // Throws with detailed message on bad $ref; caught below by error middleware
  cachedSpec = await RefParser.bundle(openapiYamlPath);
  return cachedSpec;
}

// Serve the bundled spec at /docs-json
app.get('/docs-json', async (_req, res, next) => {
  try {
    const spec = await loadOpenApiSpec();
    if (!spec?.openapi) throw new Error('Bundled spec missing "openapi" field');
    res.json(spec);
  } catch (e) {
    console.error('[OpenAPI bundle error]', e?.message || e); // <-- add this
    next(e);
  }
});

// Swagger UI with a relaxed, route-scoped CSP (inline bootstrap allowed)
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
    swaggerOptions: { url: '/docs-json' } // same-origin; works for http or https
  })
);

// ---------------- Versioned API (rate-limited)
console.log('[BOOT] API_PREFIX =', API_PREFIX);
app.use(API_PREFIX, apiLimiter, routes);

// ---------------- Root landing
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    docs: '/docs',
    spec: '/docs-json',
    api: API_PREFIX
  });
});

// ---------------- 404 & Errors (must be last)
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.originalUrl }));
app.use(errorHandler);

export default app;
