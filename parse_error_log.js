const fs = require('fs');
try {
    const content = fs.readFileSync('debug_error.log', 'utf8');
    const entries = content.split('\n---\n').filter(Boolean);
    const lastEntry = JSON.parse(entries[entries.length - 1]);
    console.log(JSON.stringify(JSON.parse(lastEntry.rawError), null, 2));
} catch (e) {
    console.error(e);
}
