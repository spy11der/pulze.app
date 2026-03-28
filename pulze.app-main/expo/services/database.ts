import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export interface SavedVibe {
  id: string;
  privacy: 'public' | 'friends' | 'private';
  energy: number;
  caption: string;
  venue: string;
  neighborhood: string;
  vibeLabel: string;
  createdAt: string;
}

export interface SavedSpot {
  id: string;
  venueId: string;
  name: string;
  category: string;
  neighborhood: string;
  note: string;
  savedAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web');
  }

  console.log('[DB] Opening SQLite database...');
  db = await SQLite.openDatabaseAsync('pulze.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS vibes (
      id TEXT PRIMARY KEY NOT NULL,
      privacy TEXT NOT NULL DEFAULT 'public',
      energy INTEGER NOT NULL DEFAULT 50,
      caption TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      vibe_label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_spots (
      id TEXT PRIMARY KEY NOT NULL,
      venue_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('[DB] Database initialized successfully');
  return db;
}

export async function insertVibe(vibe: Omit<SavedVibe, 'id' | 'createdAt'>): Promise<SavedVibe> {
  const database = await getDatabase();
  const id = `vibe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  console.log('[DB] Inserting vibe:', { id, ...vibe });

  await database.runAsync(
    `INSERT INTO vibes (id, privacy, energy, caption, venue, neighborhood, vibe_label, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    vibe.privacy,
    vibe.energy,
    vibe.caption,
    vibe.venue,
    vibe.neighborhood,
    vibe.vibeLabel,
    createdAt
  );

  return { id, ...vibe, createdAt };
}

export async function getAllVibes(): Promise<SavedVibe[]> {
  const database = await getDatabase();
  console.log('[DB] Fetching all vibes...');

  const rows = await database.getAllAsync<{
    id: string;
    privacy: string;
    energy: number;
    caption: string;
    venue: string;
    neighborhood: string;
    vibe_label: string;
    created_at: string;
  }>('SELECT * FROM vibes ORDER BY created_at DESC');

  return rows.map((row) => ({
    id: row.id,
    privacy: row.privacy as SavedVibe['privacy'],
    energy: row.energy,
    caption: row.caption,
    venue: row.venue,
    neighborhood: row.neighborhood,
    vibeLabel: row.vibe_label,
    createdAt: row.created_at,
  }));
}

export async function deleteVibe(id: string): Promise<void> {
  const database = await getDatabase();
  console.log('[DB] Deleting vibe:', id);
  await database.runAsync('DELETE FROM vibes WHERE id = ?', id);
}

export async function insertSavedSpot(spot: Omit<SavedSpot, 'id' | 'savedAt'>): Promise<SavedSpot> {
  const database = await getDatabase();
  const id = `spot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const savedAt = new Date().toISOString();

  console.log('[DB] Inserting saved spot:', { id, ...spot });

  await database.runAsync(
    `INSERT INTO saved_spots (id, venue_id, name, category, neighborhood, note, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    spot.venueId,
    spot.name,
    spot.category,
    spot.neighborhood,
    spot.note,
    savedAt
  );

  return { id, ...spot, savedAt };
}

export async function getAllSavedSpots(): Promise<SavedSpot[]> {
  const database = await getDatabase();
  console.log('[DB] Fetching all saved spots...');

  const rows = await database.getAllAsync<{
    id: string;
    venue_id: string;
    name: string;
    category: string;
    neighborhood: string;
    note: string;
    saved_at: string;
  }>('SELECT * FROM saved_spots ORDER BY saved_at DESC');

  return rows.map((row) => ({
    id: row.id,
    venueId: row.venue_id,
    name: row.name,
    category: row.category,
    neighborhood: row.neighborhood,
    note: row.note,
    savedAt: row.saved_at,
  }));
}

export async function deleteSavedSpot(id: string): Promise<void> {
  const database = await getDatabase();
  console.log('[DB] Deleting saved spot:', id);
  await database.runAsync('DELETE FROM saved_spots WHERE id = ?', id);
}

export async function isSpotSaved(venueId: string): Promise<boolean> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM saved_spots WHERE venue_id = ?',
    venueId
  );
  return (result?.count ?? 0) > 0;
}

export async function getVibeCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vibes'
  );
  return result?.count ?? 0;
}

export async function getSavedSpotCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM saved_spots'
  );
  return result?.count ?? 0;
}
