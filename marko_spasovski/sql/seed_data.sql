INSERT INTO users (ime, email, geslo, datum_registracije) VALUES
            ('Ana Novak',  'ana@example.com', 'geslo123', '2024-01-15'),
            ('Rok Kovač',  'rok@example.com', 'geslo456', '2024-02-20');

INSERT INTO workouts (user_id, datum, trajanje, tip_treninga) VALUES
    (1, '2024-04-01', 60, 'Tek'),
    (1, '2024-04-03', 45, 'Kolesarjenje'),
    (2, '2024-04-02', 90, 'Plavanje');

INSERT INTO habits (user_id, naziv, cilj) VALUES
    (1, 'Pitje vode', '2 litra dnevno'),
    (2, 'Meditacija', '10 minut dnevno');

INSERT INTO habitlogs (habit_id, datum, vrednost) VALUES
    (1, '2024-04-01', '2.1 litra'),
    (1, '2024-04-02', '1.8 litra'),
    (2, '2024-04-01', '12 minut');

INSERT INTO meals (user_id, naziv_obroka, cas, kalorije) VALUES
    (1, 'Ovseni kosmiči',    '08:00', 350),
    (1, 'Piščanec z rižem', '13:00', 620),
    (2, 'Solata z tunom',   '12:30', 410);