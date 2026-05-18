const fs = require('fs');
const lines = fs.readFileSync('src/pages/user/BudgetPlanner.jsx', 'utf8').split('\n');
let stack = [];
for (let i = 668; i < 1133; i++) {
  const line = lines[i];
  const m = line.match(/<div[^>]*>/g);
  if (m) {
    m.forEach(tag => {
      if (!tag.endsWith('/>')) {
        stack.push({ line: i + 1, class: tag.match(/className="([^"]+)"/)?.[1] || tag });
      }
    });
  }
  const c = (line.match(/<\/div>/g) || []).length;
  for (let j = 0; j < c; j++) {
    const popped = stack.pop();
    if (stack.length === 0 && i < 1120) {
      console.log(`Stack reached 0 at line: ${i + 1} popping ${popped.class}`);
    }
  }
}
console.log('Final depth:', stack.length);
