const axios = require('axios');

const baseURL = 'http://localhost:3000';

async function testAPI() {
    try {

        console.log('--- WORKOUTS ---');

        await axios.post(baseURL + '/workouts', {
            tip_treninga: 'cardio',
            trajanje: 30
        });

        let res = await axios.get(baseURL + '/workouts');
        console.log(res.data);

        await axios.put(baseURL + '/workouts/0', {
            tip_treninga: 'strength',
            trajanje: 50
        });

        await axios.delete(baseURL + '/workouts/0');


        console.log('--- HABITS ---');

        await axios.post(baseURL + '/habits', {
            naziv: 'Pitje vode',
            cilj: 2,
            enota: 'L'
        });

        res = await axios.get(baseURL + '/habits');
        console.log(res.data);

        await axios.put(baseURL + '/habits/0', {
            naziv: 'Telovadba',
            cilj: 30,
            enota: 'min'
        });

        await axios.delete(baseURL + '/habits/0');


        console.log('--- HABIT LOGS ---');

        await axios.post(baseURL + '/habitlogs', {
            habit_id: 0,
            datum: '2025-01-10',
            vrednost: 1.5
        });

        res = await axios.get(baseURL + '/habitlogs');
        console.log(res.data);

        await axios.put(baseURL + '/habitlogs/0', {
            habit_id: 0,
            datum: '2025-01-11',
            vrednost: 2
        });

        await axios.delete(baseURL + '/habitlogs/0');


        console.log('--- MEALS ---');

        await axios.post(baseURL + '/meals', {
            naziv_obroka: 'Kosilo',
            kalorije: 600
        });

        res = await axios.get(baseURL + '/meals');
        console.log(res.data);

        await axios.put(baseURL + '/meals/0', {
            naziv_obroka: 'Večerja',
            kalorije: 500
        });

        await axios.delete(baseURL + '/meals/0');


        console.log('--- DONE ---');

    } catch (err) {
        console.error('Napaka:', err.message);
    }
}

testAPI();