const fs = require('fs');
try {
    const content = fs.readFileSync('mapping.json', 'utf8'); // assuming I eventually got utf8 or retry reading
    // If reading fails, try parsing debug_error.log for structure
    // But wait, I have mapping.json on disk from the curl command.
    // The curl command was: curl ... > mapping.json.
    // Powershell encoding might be an issue.
    // Let's rely on reading mapping.json with encoding handling.

    let jsonStr;
    const buffer = fs.readFileSync('mapping.json');
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        jsonStr = buffer.subarray(2).toString('utf16le');
    } else {
        jsonStr = buffer.toString('utf8');
    }

    const mapping = JSON.parse(jsonStr);
    const props = mapping['vision-ops-overview'].mappings.properties;

    const fields = ['event_id', 'event_type', 'severity', 'zone_id', 'status', 'metric_name'];
    const result = {};
    fields.forEach(f => {
        result[f] = props[f];
    });
    console.log(JSON.stringify(result, null, 2));

} catch (e) {
    console.error('Error:', e.message);
}
