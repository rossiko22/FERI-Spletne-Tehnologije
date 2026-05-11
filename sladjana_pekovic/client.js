const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

function sendRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;

        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(responseData)
                    });
                } catch {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

async function testApi() {
    console.log('\n--- GET /workouts ---');
    console.log(await sendRequest('GET', '/workouts'));

    console.log('\n--- POST /workouts ---');
    const postResponse = await sendRequest('POST', '/workouts', {
        title: 'Jutranji trening',
        type: 'cardio',
        duration: 45,
        calories: 280
    });
    console.log(postResponse);

    const newWorkoutId = postResponse.data.workout.id;

    console.log('\n--- GET /workouts/:id ---');
    console.log(await sendRequest('GET', `/workouts/${newWorkoutId}`));

    console.log('\n--- PUT /workouts/:id ---');
    console.log(await sendRequest('PUT', `/workouts/${newWorkoutId}`, {
        duration: 50,
        calories: 320
    }));

    console.log('\n--- DELETE /workouts/:id ---');
    console.log(await sendRequest('DELETE', `/workouts/${newWorkoutId}`));

    console.log('\n--- GET /workouts po brisanju ---');
    console.log(await sendRequest('GET', '/workouts'));
}

testApi();