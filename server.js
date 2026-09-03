const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

let db;

async function getDB() {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        genre TEXT,
        release_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tv_shows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        genre TEXT,
        release_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS movie_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        movie_key TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_key),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        movie_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_key),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }
  return db;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password required' });
    }
    const db = await getDB();
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hash, 'user']
    );
    res.json({ success: true, message: 'Account created. You can log in.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error. Try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const db = await getDB();
    const user = await db.get('SELECT id, name, email, password, role FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const role = user.role || 'user';
    res.json({ success: true, message: 'Logged in', user: { id: user.id, name: user.name, email: user.email, role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Try again.' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const db = await getDB();
    const u = await db.get('SELECT COUNT(*) AS total FROM users');
    const m = await db.get('SELECT COUNT(*) AS total FROM movies');
    const t = await db.get('SELECT COUNT(*) AS total FROM tv_shows');
    res.json({
      users: u.total || 0,
      movies: m.total || 0,
      tvShows: t.total || 0,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ users: 0, movies: 0, tvShows: 0 });
  }
});

app.get('/api/admin/users-activity', async (req, res) => {
  try {
    const db = await getDB();
    const users = await db.all(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.created_at,
        (SELECT COUNT(*) FROM movie_ratings WHERE user_id = u.id) AS ratings_count,
        (SELECT COUNT(*) FROM watchlist WHERE user_id = u.id) AS watchlist_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Users activity error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/admin/movies', async (req, res) => {
  try {
    const { title, description, image_url, genre, release_date } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const db = await getDB();
    await db.run(
      'INSERT INTO movies (title, description, image_url, genre, release_date) VALUES (?, ?, ?, ?, ?)',
      [(title || '').trim(), (description || '').trim(), (image_url || '').trim() || null, (genre || '').trim() || null, (release_date || '').trim() || null]
    );
    res.json({ success: true, message: 'Movie added' });
  } catch (err) {
    console.error('Add movie error:', err);
    res.status(500).json({ success: false, message: 'Failed to add movie' });
  }
});

app.post('/api/admin/tvshows', async (req, res) => {
  try {
    const { title, description, image_url, genre, release_date } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const db = await getDB();
    await db.run(
      'INSERT INTO tv_shows (title, description, image_url, genre, release_date) VALUES (?, ?, ?, ?, ?)',
      [(title || '').trim(), (description || '').trim(), (image_url || '').trim() || null, (genre || '').trim() || null, (release_date || '').trim() || null]
    );
    res.json({ success: true, message: 'TV show added' });
  } catch (err) {
    console.error('Add TV show error:', err);
    res.status(500).json({ success: false, message: 'Failed to add TV show' });
  }
});

app.delete('/api/admin/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const table = type === 'movies' ? 'movies' : 'tv_shows';
    const db = await getDB();
    await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
});

app.get('/api/admin/all-content', async (req, res) => {
  try {
    const db = await getDB();
    const movies = await db.all('SELECT id, title, genre, "movies" as type FROM movies ORDER BY created_at DESC');
    const tvShows = await db.all('SELECT id, title, genre, "tv_shows" as type FROM tv_shows ORDER BY created_at DESC');
    res.json({ success: true, content: [...movies, ...tvShows] });
  } catch (err) {
    console.error('Get all content error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/search-suggestions', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
    const db = await getDB();
    const movies = await db.all('SELECT title FROM movies WHERE title LIKE ? LIMIT 5', [`%${q}%`]);
    const tvShows = await db.all('SELECT title FROM tv_shows WHERE title LIKE ? LIMIT 5', [`%${q}%`]);
    const suggestions = [...new Set([...movies, ...tvShows].map(i => i.title))];
    res.json({ success: true, suggestions });
  } catch (err) {
    console.error('Search suggestions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/movie-details', async (req, res) => {
  try {
    const movieKey = (req.query.movie_key || '').trim();
    if (!movieKey) {
      return res.status(400).json({ success: false, message: 'Movie key required' });
    }
    const db = await getDB();
    
    let info = await db.get('SELECT title, description, image_url, genre, release_date FROM movies WHERE title = ?', [movieKey]);
    if (!info) {
      info = await db.get('SELECT title, description, image_url, genre, release_date FROM tv_shows WHERE title = ?', [movieKey]);
    }

    const ratings = await db.all(
      'SELECT r.rating, r.review_text, r.created_at, u.name AS user_name FROM movie_ratings r JOIN users u ON r.user_id = u.id WHERE r.movie_key = ? ORDER BY r.created_at DESC',
      [movieKey]
    );
    
    const reviews = (ratings || []).map(r => ({
      rating: r.rating,
      review_text: r.review_text || '',
      created_at: r.created_at,
      user_name: r.user_name || 'User'
    }));
    const count = reviews.length;
    const average = count ? (reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : 0;

    res.json({
      success: true,
      info: info || null,
      average: parseFloat(average),
      count,
      reviews
    });
  } catch (err) {
    console.error('Get movie details error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/ratings', async (req, res) => {
  try {
    const movieKey = (req.query.movie_key || '').trim();
    if (!movieKey) {
      return res.json({ average: 0, count: 0, reviews: [] });
    }
    console.log(`Fetching ratings for: "${movieKey}"`);
    const db = await getDB();
    const rows = await db.all(
      'SELECT r.rating, r.review_text, r.created_at, u.name AS user_name FROM movie_ratings r JOIN users u ON r.user_id = u.id WHERE r.movie_key = ? ORDER BY r.created_at DESC',
      [movieKey]
    );
    const reviews = (rows || []).map(r => ({
      rating: r.rating,
      review_text: r.review_text || '',
      created_at: r.created_at,
      user_name: r.user_name || 'User'
    }));
    const count = reviews.length;
    const average = count ? (reviews.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : 0;
    res.json({ average: parseFloat(average), count, reviews });
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ average: 0, count: 0, reviews: [] });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { user_id, movie_key, rating, review_text } = req.body;
    const key = (movie_key || '').trim();
    const r = parseInt(rating, 10);
    const userId = parseInt(user_id, 10);

    if (!key || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Movie and user required' });
    }
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
    }
    
    console.log(`Saving rating for "${key}" by user ${userId}: ${r} stars`);
    const db = await getDB();
    
    const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user session. Please log in.' });
    }

    await db.run(
      'INSERT INTO movie_ratings (user_id, movie_key, rating, review_text) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, movie_key) DO UPDATE SET rating = excluded.rating, review_text = excluded.review_text',
      [userId, key, r, (review_text || '').trim() || null]
    );
    res.json({ success: true, message: 'Rating saved' });
  } catch (err) {
    console.error('Post rating error:', err);
    res.status(500).json({ success: false, message: 'Failed to save rating' });
  }
});

app.get('/api/watchlist', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
    const db = await getDB();
    const list = await db.all('SELECT movie_key FROM watchlist WHERE user_id = ?', [userId]);
    res.json({ success: true, watchlist: list.map(i => i.movie_key) });
  } catch (err) {
    console.error('Get watchlist error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/watchlist', async (req, res) => {
  try {
    const { user_id, movie_key, action } = req.body;
    if (!user_id || !movie_key) return res.status(400).json({ success: false, message: 'User ID and movie key required' });
    const db = await getDB();
    if (action === 'add') {
      await db.run('INSERT OR IGNORE INTO watchlist (user_id, movie_key) VALUES (?, ?)', [user_id, movie_key]);
      res.json({ success: true, message: 'Added to watchlist' });
    } else {
      await db.run('DELETE FROM watchlist WHERE user_id = ? AND movie_key = ?', [user_id, movie_key]);
      res.json({ success: true, message: 'Removed from watchlist' });
    }
  } catch (err) {
    console.error('Watchlist action error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(PORT, async () => {
  await getDB();
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('SQLite database initialized.');
});
