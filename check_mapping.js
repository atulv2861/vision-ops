const fs = require('fs');
// Read file with explicit encoding or auto-detect if possible, but utf16le is likely the issue.
// Try reading as buffer and identifying.
try {
    const content = fs.readFileSync('mapping.json');
    // If it starts with BOM for UTF-16LE: FF FE
    let jsonStr;
    if (content[0] === 0xFF && content[1] === 0xFE) {
        jsonStr = content.subarray(2).toString('utf16le');
    } else {
        jsonStr = content.toString('utf8');
    }

    const mapping = JSON.parse(jsonStr);
    const props = mapping['vision-ops-overview'].mappings.properties;
    console.log(JSON.stringify(props, null, 2));
} catch (e) {
    console.error(e);
}
