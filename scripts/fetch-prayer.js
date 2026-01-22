const axios = require('axios');
const moment = require('moment-timezone');

async function run() {
    try {
        console.log("🕒 Calculating today's date in Malaysia...");
        
        // 1. Get Day of Month (e.g., '21') for the URL
        const today = moment().tz('Asia/Kuala_Lumpur');
        const dayOfMonth = today.format('D'); 
        const zone = 'SGR01'; 

        const url = `https://api.waktusolat.app/solat/${zone}/${dayOfMonth}`;
        console.log(`🌍 Fetching data from: ${url}`);

        // 2. Call the API
        const response = await axios.get(url);
        const apiData = response.data;
        const prayerData = apiData.prayerTime;

        // --- HIJRI FORMATTING LOGIC ---
        // Using Curly Quote (’) to prevent JSON/Flow errors
        const hijriMonths = [
            "Muharram", "Safar", "Rabi’ul Awwal", "Rabi’ul Akhir", 
            "Jamadil Awwal", "Jamadil Akhir", "Rejab", "Sya’aban", 
            "Ramadhan", "Syawal", "Zulkaedah", "Zulhijjah"
        ];

        // prayerData.hijri comes as "1447-08-03" or "1447-08-21"
        const [hYear, hMonth, hDay] = prayerData.hijri.split('-'); 
        
        // Convert "08" to integer 8, subtract 1 to get index 7 (Sya’aban)
        const monthIndex = parseInt(hMonth, 10) - 1; 
        const monthName = hijriMonths[monthIndex];
        // Format: "03-Sya’aban-1447"
        const formattedHijri = `${hDay}-${monthName}-${hYear}`;

        // 3. Construct the Clean Payload
        const cleanData = {
            zone: apiData.zone,
            date: prayerData.date,       
            hijri: formattedHijri,       // Display: "03-Sya’aban-1447"
            hijriMonth: monthName,       // Logic: "Sya’aban" (Safe for conditions)
            hijriDay: hDay,              // Logic: "03" (Safe for conditions)
            prayers: []
        };

        const prayerMap = { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' };

        for (const [key, label] of Object.entries(prayerMap)) {
            const timeStr = prayerData[key];            
            // Generate the timestamps
            const mTime = moment.tz(`${prayerData.date} ${timeStr}`, 'DD-MMM-YYYY HH:mm:ss', 'Asia/Kuala_Lumpur');
            cleanData.prayers.push({
                name: label,                   
                time: mTime.format('hh:mm A'), 
                isoTime: mTime.toISOString()
            });
        }

        // 4. Send to Power Automate
        const payload = {
            "type": "message",
            "data": cleanData
        };

        console.log(`🚀 Sending payload to Power Automate...`);
        // console.log(JSON.stringify(payload, null, 2)); // Uncomment to test locally        
        await axios.post(process.env.POWER_AUTOMATE_WEBHOOK, payload);
        console.log('✅ Success!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

run();
