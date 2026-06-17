-- =============================================================
--  BranCodeX -- full schema (idempotent, safe on every restart)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id          SERIAL       PRIMARY KEY,
  game        VARCHAR(50)  NOT NULL,
  player      VARCHAR(80)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0),
  badges      TEXT[]       NOT NULL DEFAULT '{}',
  played_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score
  ON leaderboard_entries (game, score DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard_entries' AND column_name = 'badges'
  ) THEN
    ALTER TABLE leaderboard_entries ADD COLUMN badges TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END;
$$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL       PRIMARY KEY,
  name             VARCHAR(120) NOT NULL,
  email            VARCHAR(254) UNIQUE NOT NULL,
  password_hash    TEXT         NOT NULL,
  verified         BOOLEAN      NOT NULL DEFAULT FALSE,
  verify_token     TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users (verify_token);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  message    TEXT         NOT NULL,
  read       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  review     TEXT         NOT NULL,
  rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  photo_url  TEXT,
  status     VARCHAR(20)  NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials (status);

-- Project views
CREATE TABLE IF NOT EXISTS project_views (
  slug       VARCHAR(100) PRIMARY KEY,
  views      BIGINT       NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Snippets
CREATE TABLE IF NOT EXISTS snippets (
  id         CHAR(8)      PRIMARY KEY,
  html       TEXT         NOT NULL DEFAULT '',
  css        TEXT         NOT NULL DEFAULT '',
  js         TEXT         NOT NULL DEFAULT '',
  views      INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Weekly challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id           SERIAL       PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         NOT NULL,
  type         VARCHAR(20)  NOT NULL DEFAULT 'css'
                 CHECK (type IN ('css', 'js', 'html', 'puzzle')),
  starter_html TEXT         NOT NULL DEFAULT '',
  starter_css  TEXT         NOT NULL DEFAULT '',
  starter_js   TEXT         NOT NULL DEFAULT '',
  week_start   DATE         NOT NULL UNIQUE,
  active       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id               SERIAL       PRIMARY KEY,
  email            VARCHAR(254) UNIQUE NOT NULL,
  unsubscribe_token TEXT         NOT NULL,
  subscribed       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers (unsubscribe_token);

-- Availability (singleton)
CREATE TABLE IF NOT EXISTS availability (
  id         INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status     VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'busy', 'limited')),
  message    TEXT        NOT NULL DEFAULT 'Available for new projects',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO availability (id, status, message)
VALUES (1, 'available', 'Available for new projects')
ON CONFLICT (id) DO NOTHING;

-- Seed leaderboard (first deploy only)
INSERT INTO leaderboard_entries (game, player, score)
SELECT *
FROM (
  VALUES
    ('quiz',            'Alex',     18),
    ('quiz',            'Priya',    15),
    ('quiz',            'Kwame',    14),
    ('quiz',            'Lucia',    12),
    ('quiz',            'Hana',     10),
    ('guess-challenge', 'MaxSpeed', 9),
    ('guess-challenge', 'ZyraXx',   8),
    ('guess-challenge', 'Femi',     7),
    ('guess-challenge', 'Irina',    6),
    ('guess-challenge', 'Tariq',    5)
) AS seed(game, player, score)
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_entries LIMIT 1);

-- Seed testimonials from Google Sheets (first deploy only — migrated 2026-06-07)
INSERT INTO testimonials (name, review, rating, photo_url, status, created_at)
SELECT *
FROM (
  VALUES
    (
      'School Boy Pee',
      'How amazing this is. Very professional',
      5,
      NULL,
      'approved',
      '2025-07-04T18:10:44.881Z'::TIMESTAMPTZ
    ),
    (
      'The Law',
      'Wow, this is smooth and the added functionalities are brilliant, not just a static website, but very interactive. Well done!',
      5,
      'https://i.ibb.co/Rpv8C9Yr/pexels-ekaterina-bolovtsova-6077326.jpg',
      'approved',
      '2025-09-01T19:29:04.550Z'::TIMESTAMPTZ
    ),
    (
      'Frankline',
      'Am happy I choose Brancodex to build my site, the site is very professional, and by just looking at it, am extremely happy. I honestly can''t wait for more. Thank you Brancodex',
      5,
      NULL,
      'approved',
      '2026-03-20T05:40:36.546Z'::TIMESTAMPTZ
    ),
    (
      'Louis',
      'Very simple to use website, and straight forward, no stress. Nice one',
      5,
      'https://i.ibb.co/gMv5Wz3V/1000269110.jpg',
      'approved',
      '2026-03-29T23:21:49.550Z'::TIMESTAMPTZ
    ),
    (
      'Ngwa',
      'The amount of efforts they put in is incredible. I have had a professional website from brancodex, and it is serving me really well, and also ranking too. Great web developers. I recommend brancodex to you all.',
      5,
      NULL,
      'approved',
      '2026-04-15T14:21:01.370Z'::TIMESTAMPTZ
    )
) AS seed(name, review, rating, photo_url, status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM testimonials LIMIT 1);

-- Seed weekly challenge (first deploy only)
DO $$
DECLARE v_week DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM weekly_challenges LIMIT 1) THEN
    v_week := DATE_TRUNC('week', NOW())::DATE;
    INSERT INTO weekly_challenges
      (title, description, type, starter_html, starter_css, starter_js, week_start, active)
    VALUES (
      'CSS Glassmorphism Card',
      'Build a stunning glassmorphism card with a frosted glass effect, blurred backdrop, and subtle glowing border. It must look beautiful on the gradient background provided.',
      'css',
      '<div class="glass-card">' || chr(10) ||
      '  <h2>Glass Card</h2>' || chr(10) ||
      '  <p>Style me with glassmorphism!</p>' || chr(10) ||
      '  <button>Hover me</button>' || chr(10) ||
      '</div>',
      'body {' || chr(10) ||
      '  min-height: 100vh; display: flex;' || chr(10) ||
      '  align-items: center; justify-content: center;' || chr(10) ||
      '  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);' || chr(10) ||
      '  margin: 0; font-family: sans-serif;' || chr(10) ||
      '}' || chr(10) ||
      '/* Add your glassmorphism styles below */',
      '',
      v_week,
      TRUE
    );
  END IF;
END;
$$;
