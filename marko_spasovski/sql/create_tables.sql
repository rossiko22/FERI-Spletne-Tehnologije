CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ime TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        geslo TEXT NOT NULL,
        datum_registracije TEXT NOT NULL
    );

CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    datum TEXT NOT NULL,
    trajanje INTEGER NOT NULL,
    tip_treninga TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    naziv TEXT NOT NULL,
    cilj TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS habitlogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    datum TEXT NOT NULL,
    vrednost TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id)
);

CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    naziv_obroka TEXT NOT NULL,
    cas TEXT NOT NULL,
    kalorije INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);