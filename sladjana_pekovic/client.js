const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

let accessToken = null;

function sendRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;

        const headers = {
            'Content-Type': 'application/json'
        };

        if (body) {
            headers['Content-Length'] = Buffer.byteLength(body);
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: path,
            method: method,
            headers: headers
        };

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

async function getAccessToken() {
    console.log('\n--- POST /oauth/token ---');

    const response = await sendRequest('POST', '/oauth/token', {
        username: 'sladjana',
        password: '12345',
        grant_type: 'password'
    });

    console.log(response);

    if (response.statusCode === 200 && response.data.access_token) {
        accessToken = response.data.access_token;
        console.log('\nAccess token je uspešno pridobljen in shranjen v odjemalcu.');
    } else {
        throw new Error('Napaka pri pridobivanju access tokena.');
    }
}

async function testApi() {
    await getAccessToken();

    console.log('\n--- GET /workouts ---');
    console.log(await sendRequest('GET', '/workouts', null, accessToken));

    console.log('\n--- POST /workouts ---');
    const postResponse = await sendRequest('POST', '/workouts', {
        title: 'Jutranji trening',
        type: 'cardio',
        duration: 45,
        calories: 280
    }, accessToken);
    console.log(postResponse);

    const newWorkoutId = postResponse.data.workout.id;

    console.log('\n--- GET /workouts/:id ---');
    console.log(await sendRequest('GET', `/workouts/${newWorkoutId}`, null, accessToken));

    console.log('\n--- PUT /workouts/:id ---');
    console.log(await sendRequest('PUT', `/workouts/${newWorkoutId}`, {
        duration: 50,
        calories: 320
    }, accessToken));

    console.log('\n--- DELETE /workouts/:id ---');
    console.log(await sendRequest('DELETE', `/workouts/${newWorkoutId}`, null, accessToken));

    console.log('\n--- GET /workouts po brisanju ---');
    console.log(await sendRequest('GET', '/workouts', null, accessToken));
}

testApi().catch(error => {
    console.error('Napaka:', error.message);
});