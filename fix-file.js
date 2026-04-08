const fs = require('fs');
const path = 'C:\\Users\\Perry Home WoundCare\\OneDrive\\Desktop\\Innovacare Architecture Pro\\innovacare-trainning-main\\src\\app\\features\\learner\\learner-dashboard\\learner-dashboard.ts';

try {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  
  console.log('Original line 162 (index 161):', JSON.stringify(lines[161]));
  
  // Fix line 162 (index 161) to be just '}'
  lines[161] = '}';
  
  // Keep only first 162 lines
  const fixed = lines.slice(0, 162).join('\n') + '\n';
  
  fs.writeFileSync(path, fixed, 'utf8');
  console.log('✓ File fixed successfully!');
  console.log('✓ Line 162 is now: }');
  console.log('✓ Removed extra lines after line 162');
  
  // Verify the fix
  const verify = fs.readFileSync(path, 'utf8');
  const verifyLines = verify.split('\n');
  console.log('Verification - Total lines:', verifyLines.length);
  console.log('Last non-empty line (162):', JSON.stringify(verifyLines[161]));
} catch (err) {
  console.error('Error:', err.message);
}
