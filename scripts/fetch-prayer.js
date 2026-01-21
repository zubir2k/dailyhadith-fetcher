const axios = require('axios');
const moment = require('moment-timezone');

async function run() {
    try {
        console.log("🕒 Calculating today's date in Malaysia...");
        
        // 1. Get Day of Month (e.g., '21') for the URL
        const today = moment().tz('Asia/Kuala_Lumpur');
        const dayOfMonth = today.format('D'); 
        const zone = 'SGR01'; // Based on JAKIM Zone Code

        const url = `https://api.waktusolat.app/solat/${zone}/${dayOfMonth}`;
        console.log(`🌍 Fetching data from: ${url}`);

        // 2. Call the API
        const response = await axios.get(url);
        const apiData = response.data;
        const prayerData = apiData.prayerTime;

        // 3. Construct the Clean Payload
        const cleanData = {
            zone: apiData.zone,
            date: prayerData.date,       // "21-Jan-2026"
            hijri: prayerData.hijri,     // "1447-08-02"
            prayers: []
        };

        const prayerMap = { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' };

        for (const [key, label] of Object.entries(prayerMap)) {
            const timeStr = prayerData[key]; // "06:15:00"
            
            // Generate the missing ISO timestamp
            const mTime = moment.tz(`${prayerData.date} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur');

            cleanData.prayers.push({
                name: label,                   // "Subuh"
                time: mTime.format('hh:mm A'), // "06:15 AM"
                isoTime: mTime.toISOString() // "2026-01-20T22:15:00.000Z"
                //isoTime: mTime.format()        // "2026-01-21T06:15:00+08:00" 
            });
        }

        // 4. Send to Power Automate
        const payload = {
            "type": "message",
            "data": cleanData
        };

        console.log(`🚀 Sending payload to Power Automate...`);
        await axios.post(process.env.POWER_AUTOMATE_WEBHOOK, payload);
        console.log('✅ Success!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

run();
