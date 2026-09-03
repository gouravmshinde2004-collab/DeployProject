const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run("DROP TABLE IF EXISTS users");
    db.run("DROP TABLE IF EXISTS movies");
    db.run("DROP TABLE IF EXISTS tv_shows");
    db.run("DROP TABLE IF EXISTS movie_ratings");

    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        genre TEXT,
        release_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE tv_shows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        genre TEXT,
        release_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE movie_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        movie_key TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_key),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
        ['Admin User', 'admin@gmail.com', '$2a$10$/4HYXy07gfqLYT0dxd4DjOO/At7YC7xzVWKEHUWjyM.ZLKJ8c70zm', 'admin']);

    db.run("INSERT INTO movies (title, description, image_url, genre, release_date) VALUES (?, ?, ?, ?, ?)",
        ['The Future', 'An epic sci-fi journey into the next century.', 'images/front1.jpg', 'Sci-Fi', 'July 15, 2026']);
    
    db.run("INSERT INTO movies (title, description, image_url, genre, release_date) VALUES (?, ?, ?, ?, ?)",
        ['Mars Colony', 'The first human settlement on Mars.', 'images/front2.jpg', 'Thriller', 'December 20, 2026']);

    db.run("INSERT INTO movies (title, description, image_url, genre, release_date) VALUES (?, ?, ?, ?, ?)",
        ['Deep Sea', 'A team of explorers discovers an ancient secret.', 'images/front3.jpg', 'Adventure', 'March 12, 2027']);

    console.log("Database initialized with SQLite successfully.");
});

db.close();
