const https = require('http');

const body = JSON.stringify({
    query: {
        bool: {
            must: [
                { term: { "metric_name.keyword": "Students on Campus" } }
            ]
        }
    },
    sort: [
        { timestamp: { order: "desc" } }
    ],
    size: 1
});

const options = {
    hostname: '34.173.116.41',
    port: 9200,
    path: '/vision-ops-overview/_search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('elastic:variphi@2024').toString('base64'),
        'Content-Length': body.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (d) => {
        data += d;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(body);
req.end();
