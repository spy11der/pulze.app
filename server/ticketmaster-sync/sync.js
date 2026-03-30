/*
  Ticketmaster → SQL Server one-shot sync
  - Loads API key and DB creds from expo/.env (kept out of VCS via .gitignore)
  - Creates dbo.Events_Ticketmaster if missing
  - Upserts events by id; updates rows only when content hash changes
*/

const crypto = require('crypto');
const path = require('path');
const sql = require('mssql');

// Load env from the Expo project's .env
require('dotenv').config({ path: path.resolve(__dirname, '../../expo/.env') });

const TM_API_KEY = process.env.TICKETMASTER_API_KEY;
const TM_POSTAL_CODE = process.env.TM_POSTAL_CODE || '80202';
const TM_RADIUS = process.env.TM_RADIUS || '50';
const TM_UNIT = process.env.TM_UNIT || 'miles';
// Default start date: today at 00:00:00Z (UTC) if TM_START not provided
const now = new Date();
const defaultStartIso = new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
  0, 0, 0, 0
)).toISOString();
const TM_START = process.env.TM_START || defaultStartIso;

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
  // optional named instance: set DB_INSTANCE, leave DB_PORT undefined
  ...(process.env.DB_INSTANCE ? { options: { 
    encrypt: String(process.env.DB_ENCRYPT ?? 'true').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERT ?? 'true').toLowerCase() === 'true',
    instanceName: process.env.DB_INSTANCE,
  }} : {}),
};

function sha256(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

async function ensureTable(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Events_Ticketmaster')
BEGIN
  CREATE TABLE dbo.Events_Ticketmaster (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    name NVARCHAR(512) NULL,
    url NVARCHAR(1024) NULL,
    startDateTime DATETIME2 NULL,
    venueName NVARCHAR(512) NULL,
    postalCode NVARCHAR(20) NULL,
    rawJson NVARCHAR(MAX) NOT NULL,
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL
  );
END
`);
}

async function ensureDetailsTable(pool) {
  // Create base table if missing
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Ticketmaster')
BEGIN
  CREATE TABLE dbo.EventDetails_Ticketmaster (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    name NVARCHAR(512) NULL,
    url NVARCHAR(1024) NULL,
    -- Flattened scalar fields from details payload
    type NVARCHAR(64) NULL,
    distance FLOAT NULL,
    units NVARCHAR(16) NULL,
    locale NVARCHAR(32) NULL,
    description NVARCHAR(MAX) NULL,
    additionalInfo NVARCHAR(MAX) NULL,
    info NVARCHAR(MAX) NULL,
    pleaseNote NVARCHAR(MAX) NULL,
    productType NVARCHAR(64) NULL,
    test BIT NULL,
    -- dates
    dates_start_dateTime DATETIME2 NULL,
    dates_start_localDate DATE NULL,
    dates_start_localTime NVARCHAR(16) NULL,
    dates_timezone NVARCHAR(64) NULL,
    dates_status_code NVARCHAR(64) NULL,
    -- sales.public
    public_startDateTime DATETIME2 NULL,
    public_endDateTime DATETIME2 NULL,
    -- top-level location
    location_latitude FLOAT NULL,
    location_longitude FLOAT NULL,
    -- venue snapshot (from embedded if present)
    venue_id NVARCHAR(64) NULL,
    venue_name NVARCHAR(512) NULL,
    venue_postalCode NVARCHAR(20) NULL,
    venue_city NVARCHAR(128) NULL,
    venue_state NVARCHAR(128) NULL,
    venue_stateCode NVARCHAR(16) NULL,
    venue_countryCode NVARCHAR(8) NULL,
    venue_latitude FLOAT NULL,
    venue_longitude FLOAT NULL,
    -- seatmap / ticketLimit / accessibility
    seatmap_staticUrl NVARCHAR(1024) NULL,
    ticketLimit_info NVARCHAR(256) NULL,
    accessibility_info NVARCHAR(256) NULL,
    rawJson NVARCHAR(MAX) NOT NULL,
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL
  );
END

-- Backfill columns if table exists (safe, additive only)
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','type') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD type NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','distance') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD distance FLOAT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','units') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD units NVARCHAR(16) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','locale') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD locale NVARCHAR(32) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','description') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD description NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','additionalInfo') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD additionalInfo NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','info') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD info NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','pleaseNote') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD pleaseNote NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','productType') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD productType NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','test') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD test BIT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','dates_start_dateTime') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD dates_start_dateTime DATETIME2 NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','dates_start_localDate') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD dates_start_localDate DATE NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','dates_start_localTime') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD dates_start_localTime NVARCHAR(16) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','dates_timezone') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD dates_timezone NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','dates_status_code') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD dates_status_code NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','public_startDateTime') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD public_startDateTime DATETIME2 NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','public_endDateTime') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD public_endDateTime DATETIME2 NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','location_latitude') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD location_latitude FLOAT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','location_longitude') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD location_longitude FLOAT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_id') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_id NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_name') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_name NVARCHAR(512) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_postalCode') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_postalCode NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_city') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_city NVARCHAR(128) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_state') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_state NVARCHAR(128) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_stateCode') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_stateCode NVARCHAR(16) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_countryCode') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_countryCode NVARCHAR(8) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_latitude') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_latitude FLOAT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','venue_longitude') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD venue_longitude FLOAT NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','seatmap_staticUrl') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD seatmap_staticUrl NVARCHAR(1024) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','ticketLimit_info') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD ticketLimit_info NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.EventDetails_Ticketmaster','accessibility_info') IS NULL ALTER TABLE dbo.EventDetails_Ticketmaster ADD accessibility_info NVARCHAR(256) NULL;
`);
}

async function ensureImagesTable(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventImages_Ticketmaster')
BEGIN
  CREATE TABLE dbo.EventImages_Ticketmaster (
    id NVARCHAR(64) NOT NULL PRIMARY KEY, -- event id
    rawJson NVARCHAR(MAX) NOT NULL,       -- full images payload
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NULL
  );
END
`);
}

// Child tables for nested arrays/objects
async function ensureDetailsChildTables(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Classifications')
BEGIN
  CREATE TABLE dbo.EventDetails_Classifications (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    [primary] BIT NULL,
    segment_id NVARCHAR(64) NULL,
    segment_name NVARCHAR(128) NULL,
    genre_id NVARCHAR(64) NULL,
    genre_name NVARCHAR(128) NULL,
    subGenre_id NVARCHAR(64) NULL,
    subGenre_name NVARCHAR(128) NULL,
    type_id NVARCHAR(64) NULL,
    type_name NVARCHAR(128) NULL,
    subType_id NVARCHAR(64) NULL,
    subType_name NVARCHAR(128) NULL,
    family BIT NULL,
    CONSTRAINT PK_EventDetails_Classifications PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_PriceRanges')
BEGIN
  CREATE TABLE dbo.EventDetails_PriceRanges (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    [type] NVARCHAR(64) NULL,
    currency NVARCHAR(8) NULL,
    [min] FLOAT NULL,
    [max] FLOAT NULL,
    CONSTRAINT PK_EventDetails_PriceRanges PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Presales')
BEGIN
  CREATE TABLE dbo.EventDetails_Presales (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    name NVARCHAR(128) NULL,
    description NVARCHAR(512) NULL,
    url NVARCHAR(1024) NULL,
    startDateTime DATETIME2 NULL,
    endDateTime DATETIME2 NULL,
    CONSTRAINT PK_EventDetails_Presales PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Promoter')
BEGIN
  CREATE TABLE dbo.EventDetails_Promoter (
    eventId NVARCHAR(64) NOT NULL PRIMARY KEY,
    id NVARCHAR(64) NULL,
    name NVARCHAR(256) NULL,
    description NVARCHAR(512) NULL,
    promoterType NVARCHAR(64) NULL
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Promoters')
BEGIN
  CREATE TABLE dbo.EventDetails_Promoters (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    id NVARCHAR(64) NULL,
    name NVARCHAR(256) NULL,
    description NVARCHAR(512) NULL,
    promoterType NVARCHAR(64) NULL,
    CONSTRAINT PK_EventDetails_Promoters PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Outlets')
BEGIN
  CREATE TABLE dbo.EventDetails_Outlets (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    [type] NVARCHAR(64) NULL,
    url NVARCHAR(1024) NULL,
    name NVARCHAR(256) NULL,
    CONSTRAINT PK_EventDetails_Outlets PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Products')
BEGIN
  CREATE TABLE dbo.EventDetails_Products (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    id NVARCHAR(64) NULL,
    name NVARCHAR(256) NULL,
    url NVARCHAR(1024) NULL,
    [type] NVARCHAR(64) NULL,
    CONSTRAINT PK_EventDetails_Products PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_ExternalLinks')
BEGIN
  CREATE TABLE dbo.EventDetails_ExternalLinks (
    eventId NVARCHAR(64) NOT NULL,
    kind NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    url NVARCHAR(1024) NULL,
    CONSTRAINT PK_EventDetails_ExternalLinks PRIMARY KEY (eventId, kind, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Aliases')
BEGIN
  CREATE TABLE dbo.EventDetails_Aliases (
    eventId NVARCHAR(64) NOT NULL,
    idx INT NOT NULL,
    alias NVARCHAR(256) NULL,
    CONSTRAINT PK_EventDetails_Aliases PRIMARY KEY (eventId, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_LocalizedAliases')
BEGIN
  CREATE TABLE dbo.EventDetails_LocalizedAliases (
    eventId NVARCHAR(64) NOT NULL,
    locale NVARCHAR(32) NOT NULL,
    idx INT NOT NULL,
    alias NVARCHAR(256) NULL,
    CONSTRAINT PK_EventDetails_LocalizedAliases PRIMARY KEY (eventId, locale, idx)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Place')
BEGIN
  CREATE TABLE dbo.EventDetails_Place (
    eventId NVARCHAR(64) NOT NULL PRIMARY KEY,
    id NVARCHAR(64) NULL,
    name NVARCHAR(512) NULL,
    postalCode NVARCHAR(20) NULL,
    address_line1 NVARCHAR(256) NULL,
    city NVARCHAR(128) NULL,
    state NVARCHAR(128) NULL,
    stateCode NVARCHAR(16) NULL,
    countryCode NVARCHAR(8) NULL,
    latitude FLOAT NULL,
    longitude FLOAT NULL
  );
END
`);
}

// History tables (append-only; never overwrite). Unique by (id, contentHash)
async function ensureEventsHistoryTable(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Events_Ticketmaster_History')
BEGIN
  CREATE TABLE dbo.Events_Ticketmaster_History (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    id NVARCHAR(64) NOT NULL,
    name NVARCHAR(512) NULL,
    url NVARCHAR(1024) NULL,
    startDateTime DATETIME2 NULL,
    venueName NVARCHAR(512) NULL,
    postalCode NVARCHAR(20) NULL,
    rawJson NVARCHAR(MAX) NOT NULL,
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Events_Ticketmaster_History UNIQUE (id, contentHash)
  );
END
`);
}

async function ensureDetailsHistoryTable(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventDetails_Ticketmaster_History')
BEGIN
  CREATE TABLE dbo.EventDetails_Ticketmaster_History (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    id NVARCHAR(64) NOT NULL,
    name NVARCHAR(512) NULL,
    url NVARCHAR(1024) NULL,
    rawJson NVARCHAR(MAX) NOT NULL,
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_EventDetails_Ticketmaster_History UNIQUE (id, contentHash)
  );
END
`);
}

async function ensureImagesHistoryTable(pool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventImages_Ticketmaster_History')
BEGIN
  CREATE TABLE dbo.EventImages_Ticketmaster_History (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    id NVARCHAR(64) NOT NULL, -- event id
    rawJson NVARCHAR(MAX) NOT NULL,
    contentHash CHAR(64) NOT NULL,
    inserted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_EventImages_Ticketmaster_History UNIQUE (id, contentHash)
  );
END
`);
}

async function upsertEvent(pool, ev) {
  const id = ev.id;
  const name = ev.name;
  const url = ev.url;
  const startDateTime = ev?.dates?.start?.dateTime || null;
  const venueName = ev?._embedded?.venues?.[0]?.name || null;
  const postalCode = ev?._embedded?.venues?.[0]?.postalCode || null;
  const rawJson = JSON.stringify(ev);
  const contentHash = sha256(ev);

  // Append to history (insert-only) if new hash for this event id
  await pool.request()
    .input('id', sql.NVarChar(64), id)
    .input('name', sql.NVarChar(512), name)
    .input('url', sql.NVarChar(1024), url)
    .input('startDateTime', sql.DateTime2, startDateTime)
    .input('venueName', sql.NVarChar(512), venueName)
    .input('postalCode', sql.NVarChar(20), postalCode)
    .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
    .input('contentHash', sql.Char(64), contentHash)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Events_Ticketmaster_History WHERE id=@id AND contentHash=@contentHash)
      BEGIN
        INSERT INTO dbo.Events_Ticketmaster_History
          (id,name,url,startDateTime,venueName,postalCode,rawJson,contentHash)
        VALUES
          (@id,@name,@url,@startDateTime,@venueName,@postalCode,@rawJson,@contentHash)
      END
    `);

  const found = await pool
    .request()
    .input('id', sql.NVarChar(64), id)
    .query('SELECT contentHash FROM dbo.Events_Ticketmaster WHERE id=@id');

  if (found.recordset.length === 0) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('name', sql.NVarChar(512), name)
      .input('url', sql.NVarChar(1024), url)
      .input('startDateTime', sql.DateTime2, startDateTime)
      .input('venueName', sql.NVarChar(512), venueName)
      .input('postalCode', sql.NVarChar(20), postalCode)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        INSERT INTO dbo.Events_Ticketmaster
          (id,name,url,startDateTime,venueName,postalCode,rawJson,contentHash)
        VALUES
          (@id,@name,@url,@startDateTime,@venueName,@postalCode,@rawJson,@contentHash)
      `);
    return { inserted: 1, updated: 0 };
  }

  if (found.recordset[0].contentHash !== contentHash) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('name', sql.NVarChar(512), name)
      .input('url', sql.NVarChar(1024), url)
      .input('startDateTime', sql.DateTime2, startDateTime)
      .input('venueName', sql.NVarChar(512), venueName)
      .input('postalCode', sql.NVarChar(20), postalCode)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        UPDATE dbo.Events_Ticketmaster
        SET name=@name,
            url=@url,
            startDateTime=@startDateTime,
            venueName=@venueName,
            postalCode=@postalCode,
            rawJson=@rawJson,
            contentHash=@contentHash,
            updated_at=SYSUTCDATETIME()
        WHERE id=@id
      `);
    return { inserted: 0, updated: 1 };
  }

  return { inserted: 0, updated: 0 };
}

async function upsertEventDetails(pool, eventId, details) {
  const id = eventId;
  const name = details?.name || null;
  const url = details?.url || null;
  const rawJson = JSON.stringify(details);
  const contentHash = sha256(details);

  // Flattened scalars
  const type = details?.type || null;
  const distance = typeof details?.distance === 'number' ? details.distance : null;
  const units = details?.units || null;
  const locale = details?.locale || null;
  const description = details?.description || null;
  const additionalInfo = details?.additionalInfo || null;
  const info = details?.info || null;
  const pleaseNote = details?.pleaseNote || null;
  const productType = details?.productType || null;
  const test = typeof details?.test === 'boolean' ? (details.test ? 1 : 0) : null;

  const start = details?.dates?.start || {};
  const dates_start_dateTime = start?.dateTime ? new Date(start.dateTime) : null;
  const dates_start_localDate = start?.localDate || null;
  const dates_start_localTime = start?.localTime || null;
  const dates_timezone = details?.dates?.timezone || null;
  const dates_status_code = details?.dates?.status?.code || null;

  const publicSale = details?.sales?.public || {};
  const public_startDateTime = publicSale?.startDateTime ? new Date(publicSale.startDateTime) : null;
  const public_endDateTime = publicSale?.endDateTime ? new Date(publicSale.endDateTime) : null;

  const loc = details?.location || {};
  const location_latitude = loc?.latitude ? Number(loc.latitude) : (details?._embedded?.venues?.[0]?.location?.latitude ? Number(details._embedded.venues[0].location.latitude) : null);
  const location_longitude = loc?.longitude ? Number(loc.longitude) : (details?._embedded?.venues?.[0]?.location?.longitude ? Number(details._embedded.venues[0].location.longitude) : null);

  const venue = details?._embedded?.venues?.[0] || {};
  const venue_id = venue?.id || null;
  const venue_name = venue?.name || null;
  const venue_postalCode = venue?.postalCode || null;
  const venue_city = venue?.city?.name || null;
  const venue_state = venue?.state?.name || null;
  const venue_stateCode = venue?.state?.stateCode || null;
  const venue_countryCode = venue?.country?.countryCode || null;
  const venue_latitude = venue?.location?.latitude ? Number(venue.location.latitude) : null;
  const venue_longitude = venue?.location?.longitude ? Number(venue.location.longitude) : null;

  const seatmap_staticUrl = details?.seatmap?.staticUrl || null;
  const ticketLimit_info = details?.ticketLimit?.info || null;
  const accessibility_info = details?.accessibility?.info || null;

  // Append to history (insert-only)
  await pool.request()
    .input('id', sql.NVarChar(64), id)
    .input('name', sql.NVarChar(512), name)
    .input('url', sql.NVarChar(1024), url)
    .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
    .input('contentHash', sql.Char(64), contentHash)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.EventDetails_Ticketmaster_History WHERE id=@id AND contentHash=@contentHash)
      BEGIN
        INSERT INTO dbo.EventDetails_Ticketmaster_History
          (id,name,url,rawJson,contentHash)
        VALUES
          (@id,@name,@url,@rawJson,@contentHash)
      END
    `);

  const found = await pool
    .request()
    .input('id', sql.NVarChar(64), id)
    .query('SELECT contentHash FROM dbo.EventDetails_Ticketmaster WHERE id=@id');

  if (found.recordset.length === 0) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('name', sql.NVarChar(512), name)
      .input('url', sql.NVarChar(1024), url)
      .input('type', sql.NVarChar(64), type)
      .input('distance', sql.Float, distance)
      .input('units', sql.NVarChar(16), units)
      .input('locale', sql.NVarChar(32), locale)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('additionalInfo', sql.NVarChar(sql.MAX), additionalInfo)
      .input('info', sql.NVarChar(sql.MAX), info)
      .input('pleaseNote', sql.NVarChar(sql.MAX), pleaseNote)
      .input('productType', sql.NVarChar(64), productType)
      .input('test', sql.Bit, test)
      .input('dates_start_dateTime', sql.DateTime2, dates_start_dateTime)
      .input('dates_start_localDate', sql.Date, dates_start_localDate)
      .input('dates_start_localTime', sql.NVarChar(16), dates_start_localTime)
      .input('dates_timezone', sql.NVarChar(64), dates_timezone)
      .input('dates_status_code', sql.NVarChar(64), dates_status_code)
      .input('public_startDateTime', sql.DateTime2, public_startDateTime)
      .input('public_endDateTime', sql.DateTime2, public_endDateTime)
      .input('location_latitude', sql.Float, location_latitude)
      .input('location_longitude', sql.Float, location_longitude)
      .input('venue_id', sql.NVarChar(64), venue_id)
      .input('venue_name', sql.NVarChar(512), venue_name)
      .input('venue_postalCode', sql.NVarChar(20), venue_postalCode)
      .input('venue_city', sql.NVarChar(128), venue_city)
      .input('venue_state', sql.NVarChar(128), venue_state)
      .input('venue_stateCode', sql.NVarChar(16), venue_stateCode)
      .input('venue_countryCode', sql.NVarChar(8), venue_countryCode)
      .input('venue_latitude', sql.Float, venue_latitude)
      .input('venue_longitude', sql.Float, venue_longitude)
      .input('seatmap_staticUrl', sql.NVarChar(1024), seatmap_staticUrl)
      .input('ticketLimit_info', sql.NVarChar(256), ticketLimit_info)
      .input('accessibility_info', sql.NVarChar(256), accessibility_info)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        INSERT INTO dbo.EventDetails_Ticketmaster
          (id,name,url,
           type,distance,units,locale,description,additionalInfo,info,pleaseNote,productType,test,
           dates_start_dateTime,dates_start_localDate,dates_start_localTime,dates_timezone,dates_status_code,
           public_startDateTime,public_endDateTime,
           location_latitude,location_longitude,
           venue_id,venue_name,venue_postalCode,venue_city,venue_state,venue_stateCode,venue_countryCode,venue_latitude,venue_longitude,
           seatmap_staticUrl,ticketLimit_info,accessibility_info,
           rawJson,contentHash)
        VALUES
          (@id,@name,@url,
           @type,@distance,@units,@locale,@description,@additionalInfo,@info,@pleaseNote,@productType,@test,
           @dates_start_dateTime,@dates_start_localDate,@dates_start_localTime,@dates_timezone,@dates_status_code,
           @public_startDateTime,@public_endDateTime,
           @location_latitude,@location_longitude,
           @venue_id,@venue_name,@venue_postalCode,@venue_city,@venue_state,@venue_stateCode,@venue_countryCode,@venue_latitude,@venue_longitude,
           @seatmap_staticUrl,@ticketLimit_info,@accessibility_info,
           @rawJson,@contentHash)
      `);
    await replaceEventDetailsChildren(pool, id, details);
    return { inserted: 1, updated: 0 };
  }

  if (found.recordset[0].contentHash !== contentHash) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('name', sql.NVarChar(512), name)
      .input('url', sql.NVarChar(1024), url)
      .input('type', sql.NVarChar(64), type)
      .input('distance', sql.Float, distance)
      .input('units', sql.NVarChar(16), units)
      .input('locale', sql.NVarChar(32), locale)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('additionalInfo', sql.NVarChar(sql.MAX), additionalInfo)
      .input('info', sql.NVarChar(sql.MAX), info)
      .input('pleaseNote', sql.NVarChar(sql.MAX), pleaseNote)
      .input('productType', sql.NVarChar(64), productType)
      .input('test', sql.Bit, test)
      .input('dates_start_dateTime', sql.DateTime2, dates_start_dateTime)
      .input('dates_start_localDate', sql.Date, dates_start_localDate)
      .input('dates_start_localTime', sql.NVarChar(16), dates_start_localTime)
      .input('dates_timezone', sql.NVarChar(64), dates_timezone)
      .input('dates_status_code', sql.NVarChar(64), dates_status_code)
      .input('public_startDateTime', sql.DateTime2, public_startDateTime)
      .input('public_endDateTime', sql.DateTime2, public_endDateTime)
      .input('location_latitude', sql.Float, location_latitude)
      .input('location_longitude', sql.Float, location_longitude)
      .input('venue_id', sql.NVarChar(64), venue_id)
      .input('venue_name', sql.NVarChar(512), venue_name)
      .input('venue_postalCode', sql.NVarChar(20), venue_postalCode)
      .input('venue_city', sql.NVarChar(128), venue_city)
      .input('venue_state', sql.NVarChar(128), venue_state)
      .input('venue_stateCode', sql.NVarChar(16), venue_stateCode)
      .input('venue_countryCode', sql.NVarChar(8), venue_countryCode)
      .input('venue_latitude', sql.Float, venue_latitude)
      .input('venue_longitude', sql.Float, venue_longitude)
      .input('seatmap_staticUrl', sql.NVarChar(1024), seatmap_staticUrl)
      .input('ticketLimit_info', sql.NVarChar(256), ticketLimit_info)
      .input('accessibility_info', sql.NVarChar(256), accessibility_info)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        UPDATE dbo.EventDetails_Ticketmaster
        SET name=@name,
            url=@url,
            type=@type,
            distance=@distance,
            units=@units,
            locale=@locale,
            description=@description,
            additionalInfo=@additionalInfo,
            info=@info,
            pleaseNote=@pleaseNote,
            productType=@productType,
            test=@test,
            dates_start_dateTime=@dates_start_dateTime,
            dates_start_localDate=@dates_start_localDate,
            dates_start_localTime=@dates_start_localTime,
            dates_timezone=@dates_timezone,
            dates_status_code=@dates_status_code,
            public_startDateTime=@public_startDateTime,
            public_endDateTime=@public_endDateTime,
            location_latitude=@location_latitude,
            location_longitude=@location_longitude,
            venue_id=@venue_id,
            venue_name=@venue_name,
            venue_postalCode=@venue_postalCode,
            venue_city=@venue_city,
            venue_state=@venue_state,
            venue_stateCode=@venue_stateCode,
            venue_countryCode=@venue_countryCode,
            venue_latitude=@venue_latitude,
            venue_longitude=@venue_longitude,
            seatmap_staticUrl=@seatmap_staticUrl,
            ticketLimit_info=@ticketLimit_info,
            accessibility_info=@accessibility_info,
            rawJson=@rawJson,
            contentHash=@contentHash,
            updated_at=SYSUTCDATETIME()
        WHERE id=@id
      `);
    await replaceEventDetailsChildren(pool, id, details);
    return { inserted: 0, updated: 1 };
  }
  return { inserted: 0, updated: 0 };
}

async function replaceEventDetailsChildren(pool, eventId, details) {
  // Replace snapshot rows for arrays/objects whenever details content changes
  // Classifications
  const classifications = Array.isArray(details?.classifications) ? details.classifications : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Classifications WHERE eventId=@eventId');
  for (let i = 0; i < classifications.length; i++) {
    const c = classifications[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('primary', sql.Bit, typeof c?.primary === 'boolean' ? (c.primary ? 1 : 0) : null)
      .input('segment_id', sql.NVarChar(64), c?.segment?.id || null)
      .input('segment_name', sql.NVarChar(128), c?.segment?.name || null)
      .input('genre_id', sql.NVarChar(64), c?.genre?.id || null)
      .input('genre_name', sql.NVarChar(128), c?.genre?.name || null)
      .input('subGenre_id', sql.NVarChar(64), c?.subGenre?.id || null)
      .input('subGenre_name', sql.NVarChar(128), c?.subGenre?.name || null)
      .input('type_id', sql.NVarChar(64), c?.type?.id || null)
      .input('type_name', sql.NVarChar(128), c?.type?.name || null)
      .input('subType_id', sql.NVarChar(64), c?.subType?.id || null)
      .input('subType_name', sql.NVarChar(128), c?.subType?.name || null)
      .input('family', sql.Bit, typeof c?.family === 'boolean' ? (c.family ? 1 : 0) : null)
      .query(`
        INSERT INTO dbo.EventDetails_Classifications (
          eventId, idx, [primary], segment_id, segment_name, genre_id, genre_name, subGenre_id, subGenre_name,
          type_id, type_name, subType_id, subType_name, family
        ) VALUES (
          @eventId, @idx, @primary, @segment_id, @segment_name, @genre_id, @genre_name, @subGenre_id, @subGenre_name,
          @type_id, @type_name, @subType_id, @subType_name, @family
        )
      `);
  }

  // Price ranges
  const priceRanges = Array.isArray(details?.priceRanges) ? details.priceRanges : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_PriceRanges WHERE eventId=@eventId');
  for (let i = 0; i < priceRanges.length; i++) {
    const pr = priceRanges[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('type', sql.NVarChar(64), pr?.type || null)
      .input('currency', sql.NVarChar(8), pr?.currency || null)
      .input('min', sql.Float, typeof pr?.min === 'number' ? pr.min : null)
      .input('max', sql.Float, typeof pr?.max === 'number' ? pr.max : null)
      .query('INSERT INTO dbo.EventDetails_PriceRanges (eventId, idx, [type], currency, [min], [max]) VALUES (@eventId, @idx, @type, @currency, @min, @max)');
  }

  // Presales
  const presales = Array.isArray(details?.sales?.presales) ? details.sales.presales : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Presales WHERE eventId=@eventId');
  for (let i = 0; i < presales.length; i++) {
    const ps = presales[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('name', sql.NVarChar(128), ps?.name || null)
      .input('description', sql.NVarChar(512), ps?.description || null)
      .input('url', sql.NVarChar(1024), ps?.url || null)
      .input('startDateTime', sql.DateTime2, ps?.startDateTime ? new Date(ps.startDateTime) : null)
      .input('endDateTime', sql.DateTime2, ps?.endDateTime ? new Date(ps.endDateTime) : null)
      .query('INSERT INTO dbo.EventDetails_Presales (eventId, idx, name, description, url, startDateTime, endDateTime) VALUES (@eventId, @idx, @name, @description, @url, @startDateTime, @endDateTime)');
  }

  // Promoter object
  const promoter = details?.promoter || {};
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Promoter WHERE eventId=@eventId');
  if (Object.keys(promoter).length) {
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('id', sql.NVarChar(64), promoter?.id || null)
      .input('name', sql.NVarChar(256), promoter?.name || null)
      .input('description', sql.NVarChar(512), promoter?.description || null)
      .input('promoterType', sql.NVarChar(64), promoter?.type || null)
      .query('INSERT INTO dbo.EventDetails_Promoter (eventId, id, name, description, promoterType) VALUES (@eventId, @id, @name, @description, @promoterType)');
  }

  // Promoters array
  const promoters = Array.isArray(details?.promoters) ? details.promoters : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Promoters WHERE eventId=@eventId');
  for (let i = 0; i < promoters.length; i++) {
    const pr = promoters[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('id', sql.NVarChar(64), pr?.id || null)
      .input('name', sql.NVarChar(256), pr?.name || null)
      .input('description', sql.NVarChar(512), pr?.description || null)
      .input('promoterType', sql.NVarChar(64), pr?.type || null)
      .query('INSERT INTO dbo.EventDetails_Promoters (eventId, idx, id, name, description, promoterType) VALUES (@eventId, @idx, @id, @name, @description, @promoterType)');
  }

  // Outlets
  const outlets = Array.isArray(details?.outlets) ? details.outlets : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Outlets WHERE eventId=@eventId');
  for (let i = 0; i < outlets.length; i++) {
    const o = outlets[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('type', sql.NVarChar(64), o?.type || null)
      .input('url', sql.NVarChar(1024), o?.url || null)
      .input('name', sql.NVarChar(256), o?.name || null)
      .query('INSERT INTO dbo.EventDetails_Outlets (eventId, idx, [type], url, name) VALUES (@eventId, @idx, @type, @url, @name)');
  }

  // Products
  const products = Array.isArray(details?.products) ? details.products : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Products WHERE eventId=@eventId');
  for (let i = 0; i < products.length; i++) {
    const p = products[i] || {};
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('id', sql.NVarChar(64), p?.id || null)
      .input('name', sql.NVarChar(256), p?.name || null)
      .input('url', sql.NVarChar(1024), p?.url || null)
      .input('type', sql.NVarChar(64), p?.type || null)
      .query('INSERT INTO dbo.EventDetails_Products (eventId, idx, id, name, url, [type]) VALUES (@eventId, @idx, @id, @name, @url, @type)');
  }

  // External links: object with arrays per kind
  const externalLinks = details?.externalLinks || {};
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_ExternalLinks WHERE eventId=@eventId');
  for (const kind of Object.keys(externalLinks)) {
    const arr = Array.isArray(externalLinks[kind]) ? externalLinks[kind] : [];
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i] || {};
      await pool.request()
        .input('eventId', sql.NVarChar(64), eventId)
        .input('kind', sql.NVarChar(64), kind)
        .input('idx', sql.Int, i)
        .input('url', sql.NVarChar(1024), it?.url || it || null)
        .query('INSERT INTO dbo.EventDetails_ExternalLinks (eventId, kind, idx, url) VALUES (@eventId, @kind, @idx, @url)');
    }
  }

  // Aliases
  const aliases = Array.isArray(details?.aliases) ? details.aliases : [];
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Aliases WHERE eventId=@eventId');
  for (let i = 0; i < aliases.length; i++) {
    const a = aliases[i];
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('idx', sql.Int, i)
      .input('alias', sql.NVarChar(256), a == null ? null : String(a))
      .query('INSERT INTO dbo.EventDetails_Aliases (eventId, idx, alias) VALUES (@eventId, @idx, @alias)');
  }

  // Localized aliases: object { locale: [aliases] }
  const localizedAliases = details?.localizedAliases || {};
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_LocalizedAliases WHERE eventId=@eventId');
  for (const localeKey of Object.keys(localizedAliases)) {
    const arr = Array.isArray(localizedAliases[localeKey]) ? localizedAliases[localeKey] : [];
    for (let i = 0; i < arr.length; i++) {
      await pool.request()
        .input('eventId', sql.NVarChar(64), eventId)
        .input('locale', sql.NVarChar(32), localeKey)
        .input('idx', sql.Int, i)
        .input('alias', sql.NVarChar(256), String(arr[i]))
        .query('INSERT INTO dbo.EventDetails_LocalizedAliases (eventId, locale, idx, alias) VALUES (@eventId, @locale, @idx, @alias)');
    }
  }

  // Place object
  const place = details?.place || {};
  await pool.request().input('eventId', sql.NVarChar(64), eventId).query('DELETE FROM dbo.EventDetails_Place WHERE eventId=@eventId');
  if (Object.keys(place).length) {
    await pool.request()
      .input('eventId', sql.NVarChar(64), eventId)
      .input('id', sql.NVarChar(64), place?.id || null)
      .input('name', sql.NVarChar(512), place?.name || null)
      .input('postalCode', sql.NVarChar(20), place?.postalCode || null)
      .input('address_line1', sql.NVarChar(256), place?.address?.line1 || null)
      .input('city', sql.NVarChar(128), place?.city?.name || null)
      .input('state', sql.NVarChar(128), place?.state?.name || null)
      .input('stateCode', sql.NVarChar(16), place?.state?.stateCode || null)
      .input('countryCode', sql.NVarChar(8), place?.country?.countryCode || null)
      .input('latitude', sql.Float, place?.location?.latitude ? Number(place.location.latitude) : null)
      .input('longitude', sql.Float, place?.location?.longitude ? Number(place.location.longitude) : null)
      .query(`INSERT INTO dbo.EventDetails_Place (eventId, id, name, postalCode, address_line1, city, state, stateCode, countryCode, latitude, longitude)
              VALUES (@eventId, @id, @name, @postalCode, @address_line1, @city, @state, @stateCode, @countryCode, @latitude, @longitude)`);
  }
}

async function upsertEventImages(pool, eventId, imagesPayload) {
  const id = eventId;
  const rawJson = JSON.stringify(imagesPayload);
  const contentHash = sha256(imagesPayload);

  // Append to history (insert-only)
  await pool.request()
    .input('id', sql.NVarChar(64), id)
    .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
    .input('contentHash', sql.Char(64), contentHash)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.EventImages_Ticketmaster_History WHERE id=@id AND contentHash=@contentHash)
      BEGIN
        INSERT INTO dbo.EventImages_Ticketmaster_History
          (id,rawJson,contentHash)
        VALUES
          (@id,@rawJson,@contentHash)
      END
    `);

  const found = await pool
    .request()
    .input('id', sql.NVarChar(64), id)
    .query('SELECT contentHash FROM dbo.EventImages_Ticketmaster WHERE id=@id');

  if (found.recordset.length === 0) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        INSERT INTO dbo.EventImages_Ticketmaster
          (id,rawJson,contentHash)
        VALUES
          (@id,@rawJson,@contentHash)
      `);
    return { inserted: 1, updated: 0 };
  }

  if (found.recordset[0].contentHash !== contentHash) {
    await pool
      .request()
      .input('id', sql.NVarChar(64), id)
      .input('rawJson', sql.NVarChar(sql.MAX), rawJson)
      .input('contentHash', sql.Char(64), contentHash)
      .query(`
        UPDATE dbo.EventImages_Ticketmaster
        SET rawJson=@rawJson,
            contentHash=@contentHash,
            updated_at=SYSUTCDATETIME()
        WHERE id=@id
      `);
    return { inserted: 0, updated: 1 };
  }
  return { inserted: 0, updated: 0 };
}

async function syncOnce() {
  if (!TM_API_KEY) throw new Error('Missing TICKETMASTER_API_KEY in expo/.env');
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?postalCode=${TM_POSTAL_CODE}&radius=${TM_RADIUS}&unit=${TM_UNIT}&startDateTime=${encodeURIComponent(TM_START)}&apikey=${TM_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster request failed: ${res.status} ${res.statusText}`);

  const usage = {};
  for (const [k, v] of res.headers) {
    if (k.toLowerCase().startsWith('x-rate')) usage[k] = v;
  }

  const data = await res.json();
  const events = data?._embedded?.events ?? [];

  const pool = await sql.connect(dbConfig);
  try {
    await ensureTable(pool);
    await ensureDetailsTable(pool);
    await ensureImagesTable(pool);
    await ensureDetailsChildTables(pool);
    await ensureEventsHistoryTable(pool);
    await ensureDetailsHistoryTable(pool);
    await ensureImagesHistoryTable(pool);

    let inserted = 0, updated = 0, unchanged = 0;
    let detInserted = 0, detUpdated = 0, imgInserted = 0, imgUpdated = 0;

    for (const ev of events) {
      const r = await upsertEvent(pool, ev);
      inserted += r.inserted; updated += r.updated; unchanged += (r.inserted === 0 && r.updated === 0) ? 1 : 0;

      // Fetch details
      const detRes = await fetch(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(ev.id)}?apikey=${TM_API_KEY}`);
      const detPayload = await detRes.json();
      const rd = await upsertEventDetails(pool, ev.id, detPayload);
      detInserted += rd.inserted; detUpdated += rd.updated;

      // Fetch images
      const imgRes = await fetch(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(ev.id)}/images?apikey=${TM_API_KEY}`);
      const imgPayload = await imgRes.json();
      const ri = await upsertEventImages(pool, ev.id, imgPayload);
      imgInserted += ri.inserted; imgUpdated += ri.updated;
    }
    console.log(`[TM Sync] ${events.length} events processed → base: ins=${inserted} upd=${updated} same=${unchanged}; details: ins=${detInserted} upd=${detUpdated}; images: ins=${imgInserted} upd=${imgUpdated}`);
    if (Object.keys(usage).length) console.log('[TM Sync] API usage headers:', usage);
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  syncOnce().catch((err) => {
    console.error('[TM Sync] Error:', err);
    process.exitCode = 1;
  });
}

module.exports = { syncOnce };
