const fs = require('fs');
const path = require('path');

const loginPath = path.join(__dirname, '../src/views/LoginView.tsx');
let content = fs.readFileSync(loginPath, 'utf8');

const splitIndex = content.indexOf('{/* --- EXTENSION BELOW THE FOLD --- */}');
if (splitIndex === -1) {
  console.log('Split index not found');
  process.exit(1);
}

const beforeSplit = content.substring(0, splitIndex);
const afterSplit = content.substring(splitIndex);

// The afterSplit goes until the final `</div>\n  );\n};`
const endIndex = afterSplit.lastIndexOf('    </div>\n  );\n};');

if (endIndex === -1) {
  console.log('End index not found');
  process.exit(1);
}

const gridContent = afterSplit.substring(0, endIndex);
const remainder = afterSplit.substring(endIndex);

const marketingGridContent = `import React from 'react';

export const MarketingGrid = () => {
  return (
    <>
      ${gridContent.trim()}
    </>
  );
};
`;

const newLoginContent = beforeSplit + `      <MarketingGrid />\n` + remainder;

// Add import for MarketingGrid
const importStatement = `import { MarketingGrid } from '../components/auth/MarketingGrid';\n`;
const finalLoginContent = newLoginContent.replace(`import { SignIn, SignUp } from '@clerk/clerk-react';`, `import { SignIn, SignUp } from '@clerk/clerk-react';\n${importStatement}`);

fs.mkdirSync(path.join(__dirname, '../src/components/auth'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../src/components/auth/MarketingGrid.tsx'), marketingGridContent, 'utf8');
fs.writeFileSync(loginPath, finalLoginContent, 'utf8');

console.log('Refactoring complete');
