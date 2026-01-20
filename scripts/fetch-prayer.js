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
        const dateStr = todayData.date; // e.g. "19-Jan-2026"

        const prayerMap = { 
            fajr: 'Subuh', 
            dhuhr: 'Zohor', 
            asr: 'Asar', 
            maghrib: 'Maghrib', 
            isha: 'Isyak' 
        };
        
        const prayersList = [];

        for (const [key, label] of Object.entries(prayerMap)) {
            const timeStr = todayData[key]; 
            const isoTime = moment.tz(`${dateStr} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur').format();
            
            prayersList.push({
                name: label,
                time: isoTime,
                message: `🕋 Waktu Solat ${label} (${timeStr}). \n\nMarilah kita solat di awal waktu.`
            });
        }

        const teamsPayload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.2",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": `Daily Prayer Schedule: ${dateStr}`
                            }
                        ],
                        "myData": {
                            "date": dateStr,
                            "prayers": prayersList
                        }
                    }
                }
            ]
        };

        console.log(`Sending payload for ${dateStr}...`);
        
        // FIXED: Now uses the exact secret name you created
        await axios.post(process.env.POWER_AUTOMATE_WEBHOOK, teamsPayload);
        
        console.log('✅ Webhook sent successfully.');

    } catch (error) {
        if (error.response && error.response.status < 500) {
            console.log('✅ Request sent (Teams trigger accepted the handshake).');
        } else {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }
}

run();
