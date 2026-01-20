const axios = require('axios');
const moment = require('moment-timezone');

async function run() {
    try {
        console.log("Fetching data from E-Solat...");
        const response = await axios.get('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=sgr01');
        const apiData = response.data;
        const todayData = apiData.prayerTime[0];

        // 1. Capture Zone, Date, Hijri
        const cleanData = {
            zone: apiData.zone,          // "sgr01"
            date: todayData.date,        // "20-Jan-2026"
            hijri: todayData.hijri,      // "1447-08-01"
            prayers: []
        };

        const prayerMap = { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' };

        // 2. Capture Prayer Name and Time (AM/PM)
        for (const [key, label] of Object.entries(prayerMap)) {
            const timeStr = todayData[key]; // e.g. "13:27:00"
            
            // Create the Moment Object once
            const mTime = moment.tz(`${todayData.date} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur');

            cleanData.prayers.push({
                name: label,                  // "Zohor"
                time: mTime.format('hh:mm A'), // "01:27 PM" (Display)
                isoTime: mTime.format()       // "2026-01-20T13:27:00+08:00" (Engine)
            });
        }

        // 3. Wrap in simple text for Teams Webhook
        const payload = {
            "type": "message",
            "text": JSON.stringify(cleanData)
        };

        console.log(`Sending cleaned payload for ${cleanData.date}...`);

        await axios.post(process.env.POWER_AUTOMATE_WEBHOOK, payload, {
            timeout: 5000 // Ignore timeout if PA is slow to respond
        }).catch(err => {
            if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                console.log('✅ Request sent! (Ignored timeout)');
                return;
            }
            throw err;
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

run();
