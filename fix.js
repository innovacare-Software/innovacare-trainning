const fs = require('fs');
const p = __dirname + '/src/app/features/learner/learner-dashboard/learner-dashboard.ts';
const content = fs.readFileSync(p, 'utf8');
const lines = content.split(/\r?\n/);
console.log('Total lines:', lines.length);
console.log('Line 161 (idx):', JSON.stringify(lines[161]));
console.log('Line 162 (idx):', JSON.stringify(lines[162]));
console.log('Line 163 (idx):', JSON.stringify(lines[163]));
// Keep only first 162 lines (0-161), the class closing } is on index 161
const clean = lines.slice(0, 162).join('\n') + '\n';
fs.writeFileSync(p, clean, 'utf8');
console.log('Done. File now ends at line 162 with:', JSON.stringify(lines[161]));
