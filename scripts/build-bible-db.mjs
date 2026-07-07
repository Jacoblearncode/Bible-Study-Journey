#!/usr/bin/env node
// Builds the bundled offline Bible database (assets/bible/bible.db) from
// public-domain source texts. Run once during development whenever the set
// of translations changes — the app never fetches this data at runtime.
//
// Sources come from https://github.com/seven1m/open-bibles, a repo of public
// domain / freely licensed bibles in USFX XML, which bible-api.com's own
// terms of use point to for bulk access (their live API explicitly asks
// callers not to scrape a whole translation through it).
//
// Requires Node >= 22.5 for the built-in node:sqlite module.

import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseUsfx } from './lib/parse-usfx.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.source-cache');
const OUT_DIR = path.join(ROOT, 'assets', 'bible');
const OUT_DB = path.join(OUT_DIR, 'bible.db');

const SOURCE_BASE_URL = 'https://raw.githubusercontent.com/seven1m/open-bibles/master/';

// Standard 66-book Protestant canon, in canonical order. Used to filter out
// the apocrypha/deuterocanonical books present in the WEB source file, and to
// assign each book's display order and testament.
const CANONICAL_BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];
const OLD_TESTAMENT_BOOK_COUNT = 39;

const TRANSLATIONS = [
  {
    id: 'cuv-hant',
    file: 'chi-cuv.usfx.xml',
    name: 'Chinese Union Version (Traditional)',
    language: 'zh-Hant',
    license: 'Public Domain',
  },
  {
    id: 'cuv-hans',
    file: 'chi-cuv-simp.usfx.xml',
    name: 'Chinese Union Version (Simplified)',
    language: 'zh-Hans',
    license: 'Public Domain',
  },
  {
    id: 'web',
    file: 'eng-web.usfx.xml',
    name: 'World English Bible',
    language: 'en',
    license: 'Public Domain',
  },
];

async function fetchSource(file) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, file);
  if (existsSync(cachePath)) {
    return readFile(cachePath, 'utf8');
  }
  const url = SOURCE_BASE_URL + file;
  console.log(`Fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  await writeFile(cachePath, text, 'utf8');
  return text;
}

function createSchema(db) {
  db.exec(`
    CREATE TABLE translations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      license TEXT NOT NULL
    );

    CREATE TABLE books (
      id TEXT PRIMARY KEY,
      order_index INTEGER NOT NULL,
      testament TEXT NOT NULL,
      name_en TEXT NOT NULL,
      name_zh_hant TEXT NOT NULL,
      name_zh_hans TEXT NOT NULL
    );

    CREATE TABLE verses (
      id INTEGER PRIMARY KEY,
      translation_id TEXT NOT NULL REFERENCES translations(id),
      book_id TEXT NOT NULL REFERENCES books(id),
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      verse_label TEXT NOT NULL,
      text TEXT NOT NULL
    );

    CREATE INDEX idx_verses_lookup ON verses(translation_id, book_id, chapter);

    -- Trigram tokenizer (built into FTS5) instead of the default word
    -- tokenizer: Chinese text has no spaces between words, so a word-based
    -- tokenizer would index each verse as one giant token. Trigram indexes
    -- overlapping 3-character sequences, which gives correct substring
    -- search for CJK text and works fine for English too.
    CREATE VIRTUAL TABLE verses_fts USING fts5(
      text,
      content='verses',
      content_rowid='id',
      tokenize='trigram'
    );
  `);
}

async function main() {
  const parsedByTranslation = new Map();

  for (const translation of TRANSLATIONS) {
    const xml = await fetchSource(translation.file);
    const { bookTitles, verses } = parseUsfx(xml);
    const canonicalVerses = verses.filter((v) => CANONICAL_BOOKS.includes(v.book));
    parsedByTranslation.set(translation.id, { bookTitles, verses: canonicalVerses });
    console.log(`${translation.id}: ${canonicalVerses.length} verses parsed`);
  }

  const hantTitles = parsedByTranslation.get('cuv-hant').bookTitles;
  const hansTitles = parsedByTranslation.get('cuv-hans').bookTitles;
  const enTitles = parsedByTranslation.get('web').bookTitles;

  const books = CANONICAL_BOOKS.map((id, index) => ({
    id,
    order_index: index,
    testament: index < OLD_TESTAMENT_BOOK_COUNT ? 'OT' : 'NT',
    name_en: enTitles[id],
    name_zh_hant: hantTitles[id],
    name_zh_hans: hansTitles[id],
  }));

  const missing = books.filter((b) => !b.name_en || !b.name_zh_hant || !b.name_zh_hans);
  if (missing.length > 0) {
    throw new Error(`Missing book titles for: ${missing.map((b) => b.id).join(', ')}`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await rm(OUT_DB, { force: true });

  const db = new DatabaseSync(OUT_DB);
  db.exec('PRAGMA journal_mode = OFF');
  createSchema(db);

  db.exec('BEGIN');
  try {
    const insertTranslation = db.prepare(
      'INSERT INTO translations (id, name, language, license) VALUES (?, ?, ?, ?)'
    );
    for (const t of TRANSLATIONS) {
      insertTranslation.run(t.id, t.name, t.language, t.license);
    }

    const insertBook = db.prepare(
      'INSERT INTO books (id, order_index, testament, name_en, name_zh_hant, name_zh_hans) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const b of books) {
      insertBook.run(b.id, b.order_index, b.testament, b.name_en, b.name_zh_hant, b.name_zh_hans);
    }

    const insertVerse = db.prepare(
      'INSERT INTO verses (translation_id, book_id, chapter, verse, verse_label, text) VALUES (?, ?, ?, ?, ?, ?)'
    );
    let totalVerses = 0;
    for (const translation of TRANSLATIONS) {
      const { verses } = parsedByTranslation.get(translation.id);
      for (const v of verses) {
        insertVerse.run(translation.id, v.book, v.chapter, v.verse, v.verseLabel, v.text);
        totalVerses += 1;
      }
    }

    db.exec("INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses");
    db.exec('COMMIT');
    console.log(`Inserted ${totalVerses} verses across ${TRANSLATIONS.length} translations.`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  db.exec('PRAGMA optimize');
  db.close();

  const { size } = await stat(OUT_DB);
  console.log(`Wrote ${OUT_DB} (${(size / (1024 * 1024)).toFixed(2)} MiB)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
