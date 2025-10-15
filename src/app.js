// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import RefParser from '@apidevtools/json-schema-ref-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import requestId from './middleware/requestID.js';     // matches your tree
import { apiLimiter } from './middleware/rateLimit.js';
import timeoutMw from './middleware/timeout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const ENABLE_HSTS = process.env.ENABLE_HSTS === 'true'; // set true in prod HTTPS

// ---------------- Core & Security (order matters)
app.disable('x-powered-by');

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
      "script-src": ["'self'"],
      "style-src": ["'self'"],
      "img-src": ["'self'"],
      "font-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'self'"],
      upgradeInsecureRequests: null
    }
  })
);

app.use(cors());
app.use(express.json());

// Request logging with request id token
morgan.token('reqid', (req) => req.id);
app.use(morgan(':method :url :status - reqid=:reqid :response-time ms'));

// ---------------- Health (fast, dependency-free)
app.get('/healthz', (_req, res) => res.status(200).type('text/plain').send('ok'));

// ---------------- Swagger (YAML + $ref bundling → served as JSON)
// Absolute path to root YAML
const openapiYamlPath = path.join(__dirname, 'docs', 'openapi.yaml');

// In-memory cache (prod). In development, rebuild on every request.
let cachedSpec = null;
async function loadOpenApiSpec() {
  if (process.env.NODE_ENV !== 'development' && cachedSpec) return cachedSpec;
  cachedSpec = await RefParser.bundle(openapiYamlPath);
  return cachedSpec;
}

// Serve the bundled spec at /docs-json
app.get('/docs-json', async (_req, res, next) => {
  try {
    const spec = await loadOpenApiSpec();
    res.json(spec);
  } catch (e) {
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
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "font-src": ["'self'", "https:", "data:"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
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
