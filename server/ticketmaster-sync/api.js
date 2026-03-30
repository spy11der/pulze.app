/*
  Minimal Express API to serve Ticketmaster data from SQL Server
  - Reads env from ../../expo/.env
  - Endpoints:
    GET  /api/health
    GET  /api/tm/events?limit=50            → ArtistListing[] (for Expo list UI)
    GET  /api/tm/events/:id                 → { id, base, details, images }
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../expo/.env') });

const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const PORT = Number(process.env.TM_API_PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Reuse DB config approach from sync.js
const dbConfig = {
  server: process.env.DB_SERVER || 'GP3-ACES',
  user: process.env.DB_USER || 'PulzeDevUser',
  password: process.env.DB_PASSWORD || 'Tester123!',
  database: process.env.DB_DATABASE || 'Pulze',
  options: {
    encrypt: String(process.env.DB_ENCRYPT ?? 'true').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERT ?? 'true').toLowerCase() === 'true',
  },
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  ...(process.env.DB_INSTANCE
    ? {
        options: {
          encrypt: String(process.env.DB_ENCRYPT ?? 'true').toLowerCase() === 'true',
          trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERT ?? 'true').toLowerCase() === 'true',
          instanceName: process.env.DB_INSTANCE,
        },
      }
    : {}),
};

function pickImage(ev) {
  const imgs = Array.isArray(ev?.images) ? ev.images : [];
  if (!imgs.length) return null;
  const sixteenNine = imgs
    .filter((i) => String(i.ratio || '').toLowerCase() === '16_9')
    .sort((a, b) => (b.width || 0) - (a.width || 0));
  return sixteenNine[0]?.url || imgs[0]?.url || null;
}

function fmtDate(ev) {
  const d = ev?.dates?.start;
  if (!d) return 'TBA';
  const js = d.dateTime ? new Date(d.dateTime) : d.localDate ? new Date(d.localDate) : new Date();
  return js.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toArtistListing(ev) {
  const venue = ev?._embedded?.venues?.[0];
  const attraction = ev?._embedded?.attractions?.[0];
  const price = Array.isArray(ev?.priceRanges) && ev.priceRanges.length > 0 ? Number(ev.priceRanges[0].min ?? 0) : 0;
  const genre = ev?.classifications?.[0]?.genre?.name ?? 'Event';
  return {
    id: String(ev.id),
    artistName: String(attraction?.name ?? ev.name ?? 'Event'),
    eventName: String(ev.name ?? 'Event'),
    venue: String(venue?.name ?? 'TBA'),
    venueId: String(venue?.id ? `tmv-${venue.id}` : 'tmv-unknown'),
    date: fmtDate(ev),
    startingPrice: Number.isFinite(price) ? price : 0,
    image: pickImage(ev) || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
    genre,
    trending: Boolean(ev?.promoter || ev?.pleaseNote),
    sellingFast: false,
    soldOutPercent: 0,
  };
}

async function createPool() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();
  return pool;
}

async function main() {
  const app = express();
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/tm/events', async (req, res) => {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    let pool;
    try {
      pool = await createPool();
      const q = await pool
        .request()
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) id, name, url, startDateTime, rawJson
          FROM dbo.Events_Ticketmaster
          ORDER BY COALESCE(updated_at, inserted_at) DESC
        `);
      const rows = q.recordset || [];
      const events = rows.map((r) => {
        try {
          return JSON.parse(r.rawJson);
        } catch (_e) {
          return null;
        }
      }).filter(Boolean);
      const listings = events.map(toArtistListing);
      res.json(listings);
    } catch (e) {
      console.error('[API] /api/tm/events error:', e);
      res.status(500).json({ error: 'internal_error' });
    } finally {
      if (pool) await pool.close();
    }
  });

  app.get('/api/tm/events/:id', async (req, res) => {
    const id = String(req.params.id);
    let pool;
    try {
      pool = await createPool();
      const baseQ = await pool.request().input('id', sql.NVarChar(64), id).query(`
        SELECT rawJson FROM dbo.Events_Ticketmaster WHERE id=@id
      `);
      const detQ = await pool.request().input('id', sql.NVarChar(64), id).query(`
        SELECT rawJson FROM dbo.EventDetails_Ticketmaster WHERE id=@id
      `);
      const imgQ = await pool.request().input('id', sql.NVarChar(64), id).query(`
        SELECT rawJson FROM dbo.EventImages_Ticketmaster WHERE id=@id
      `);

      const base = baseQ.recordset?.[0]?.rawJson ? JSON.parse(baseQ.recordset[0].rawJson) : null;
      const details = detQ.recordset?.[0]?.rawJson ? JSON.parse(detQ.recordset[0].rawJson) : null;
      const images = imgQ.recordset?.[0]?.rawJson ? JSON.parse(imgQ.recordset[0].rawJson) : null;
      res.json({ id, base, details, images });
    } catch (e) {
      console.error('[API] /api/tm/events/:id error:', e);
      res.status(500).json({ error: 'internal_error' });
    } finally {
      if (pool) await pool.close();
    }
  });

  app.listen(PORT, () => {
    console.log(`[API] Ticketmaster API server listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('[API] Fatal startup error:', e);
  process.exit(1);
});
