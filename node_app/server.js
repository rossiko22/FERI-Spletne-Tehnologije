const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {

    // /podatkovni-model/
    if (req.url === '/podatkovni-model/') {

        fs.readFile('podatkovni-model.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Napaka pri nalaganju HTML');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }

    // /REST/
    else if (req.url === '/REST/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });

        res.end(`
REST API storitve za Fitness Buddy

GET /users
POST /users

GET /workouts
POST /workouts
PUT /workouts/:id
DELETE /workouts/:id

GET /habits
POST /habits

GET /habitlogs
POST /habitlogs

GET /meals
POST /meals
PUT /meals/:id
DELETE /meals/:id
        `);
    }

    // slika
    else if (req.url === '/er_diagram.png') {
        fs.readFile('er_diagram.png', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Slika ni najdena');
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    }

    else {
        res.writeHead(404);
        res.end('Stran ne obstaja');
    }

});

server.listen(3000);
