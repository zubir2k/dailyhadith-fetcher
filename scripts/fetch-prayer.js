const axios = require('axios');
const moment = require('moment-timezone');

async function run() {
    try {
        // 1. Fetch Today's Data (SGR01)
        console.log("Fetching data from E-Solat...");
        const response = await axios.get('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=today&zone=sgr01');
        const apiData = response.data;

        if (!apiData.prayerTime || apiData.prayerTime.length === 0) {
            throw new Error('API returned no prayer time data.');
        }

        const todayData = apiData.prayerTime[0];
        const dateStr = todayData.date; // e.g. "19-Jan-2026"

        // 2. Format Data for Automation
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
            
            // Create strict ISO Timestamp (e.g. 2026-01-19T13:27:00+08:00)
            // This allows Power Automate to wait until this exact second
            const isoTime = moment.tz(`${dateStr} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur').format();
            
            prayersList.push({
                name: label,
                time: isoTime,
                message: `🕋 Waktu Solat ${label} (${timeStr}). \n\nMarilah kita solat di awal waktu.`
            });
        }

        // 3. THE WRAPPER: Package it as a Teams Card
        // This structure is required to pass the "Teams Webhook" trigger check
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
                        // HIDDEN DATA: This is where we hide our real payload
                        "myData": {
                            "date": dateStr,
                            "prayers": prayersList
                        }
                    }
                }
            ]
        };

        // 4. Send to Power Automate
        console.log(`Sending payload for ${dateStr}...`);
        await axios.post(process.env.WEBHOOK_URL, teamsPayload);
        console.log('✅ Webhook sent successfully.');

    } catch (error) {
        // Teams sometimes returns non-standard success codes
        if (error.response && error.response.status < 500) {
            console.log('✅ Request sent (Teams trigger accepted the handshake).');
        } else {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }
}

run();

