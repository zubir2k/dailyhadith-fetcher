const axios = require('axios');
const moment = require('moment-timezone');

async function run() {
    try {
        console.log("Fetching data from E-Solat...");
        const response = await axios.get('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=sgr01');
        const apiData = response.data;

        if (!apiData.prayerTime || apiData.prayerTime.length === 0) {
            throw new Error('API returned no prayer time data.');
        }

        const todayData = apiData.prayerTime[0];
        const dateStr = todayData.date;

        const prayerMap = { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' };
        const prayersList = [];

        for (const [key, label] of Object.entries(prayerMap)) {
            const timeStr = todayData[key]; 
            const isoTime = moment.tz(`${dateStr} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur').format();
            
            prayersList.push({
                name: label,
                time: isoTime,
                message: `🕋 Waktu Solat ${label} (${timeStr}).\nMarilah kita solat di awal waktu ...`
            });
        }
        // "stringify" data so it fits safely inside the 'text' field.
        const cleanData = {
            date: dateStr,
            prayers: prayersList
        };

        const simplePayload = {
            "type": "message",
            "text": JSON.stringify(cleanData) // Pack the data into a string
        };

        console.log(`Sending payload for ${dateStr}...`);
        
        await axios.post(process.env.POWER_AUTOMATE_WEBHOOK, simplePayload);
        
        console.log('✅ Webhook sent successfully.');

    } catch (error) {
        if (error.response) {
            console.error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            // If it's a 400 error, the payload format is definitely the issue.
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

run();
