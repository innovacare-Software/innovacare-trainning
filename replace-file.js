const fs = require('fs');
const path = require('path');

// Read the fixed file
const fixedPath = path.join(__dirname, 'src/app/features/learner/learner-dashboard/learner-dashboard.ts.fixed');
const targetPath = path.join(__dirname, 'src/app/features/learner/learner-dashboard/learner-dashboard.ts');

try {
  const content = fs.readFileSync(fixedPath, 'utf8');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('File replaced successfully!');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
