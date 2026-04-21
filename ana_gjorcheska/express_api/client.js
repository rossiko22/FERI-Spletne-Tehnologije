const axios = require('axios');

const baseURL = 'http://localhost:3000';

const oauthClient = {
    client_id: 'fitness-client',
    client_secret: 'super-secret-client-key'
};

let accessToken = null;

async function getAccessToken() {
    const response = await axios.post(
        `${baseURL}/oauth/token`,
        new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: oauthClient.client_id,
            client_secret: oauthClient.client_secret
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    accessToken = response.data.access_token;
    console.log('Pridobljen access token:', accessToken);
}

function authHeaders() {
    return {
        Authorization: `Bearer ${accessToken}`
    };
}

async function testAPI() {
    try {
        await getAccessToken();

        console.log('\n--- WORKOUTS ---');
        await axios.post(`${baseURL}/workouts`,
            { tip_treninga: 'cardio', trajanje: 30 },
            { headers: authHeaders() }
        );

        let res = await axios.get(`${baseURL}/workouts`, {
            headers: authHeaders()
        });
        console.log('Workouts:', res.data);

        await axios.put(`${baseURL}/workouts/0`,
            { tip_treninga: 'strength', trajanje: 50 },
            { headers: authHeaders() }
        );

        await axios.delete(`${baseURL}/workouts/0`, {
            headers: authHeaders()
        });

        console.log('\n--- HABITS ---');
        await axios.post(`${baseURL}/habits`,
            { naziv: 'Pitje vode', cilj: 2, enota: 'L' },
            { headers: authHeaders() }
        );

        res = await axios.get(`${baseURL}/habits`, {
            headers: authHeaders()
        });
        console.log('Habits:', res.data);

        await axios.put(`${baseURL}/habits/0`,
            { naziv: 'Telovadba', cilj: 30, enota: 'min' },
            { headers: authHeaders() }
        );

        await axios.delete(`${baseURL}/habits/0`, {
            headers: authHeaders()
        });

        console.log('\n--- HABIT LOGS ---');
        await axios.post(`${baseURL}/habitlogs`,
            { habit_id: 0, datum: '2026-04-14', vrednost: 1.5 },
            { headers: authHeaders() }
        );

        res = await axios.get(`${baseURL}/habitlogs`, {
            headers: authHeaders()
        });
        console.log('HabitLogs:', res.data);

        await axios.put(`${baseURL}/habitlogs/0`,
            { habit_id: 0, datum: '2026-04-15', vrednost: 2.0 },
            { headers: authHeaders() }
        );

        await axios.delete(`${baseURL}/habitlogs/0`, {
            headers: authHeaders()
        });

        console.log('\n--- MEALS ---');
        await axios.post(`${baseURL}/meals`,
            { naziv_obroka: 'Kosilo', kalorije: 600 },
            { headers: authHeaders() }
        );

        res = await axios.get(`${baseURL}/meals`, {
            headers: authHeaders()
        });
        console.log('Meals:', res.data);

        await axios.put(`${baseURL}/meals/0`,
            { naziv_obroka: 'Večerja', kalorije: 500 },
            { headers: authHeaders() }
        );

        await axios.delete(`${baseURL}/meals/0`, {
            headers: authHeaders()
        });

        console.log('\n--- DONE ---');
    } catch (error) {
        if (error.response) {
            console.error('Napaka API:', error.response.status, error.response.data);
        } else {
            console.error('Napaka:', error.message);
        }
    }
}

testAPI();