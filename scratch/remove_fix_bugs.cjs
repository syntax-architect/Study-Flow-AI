const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.git') && !dirPath.includes('.ignored')) {
        walk(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx') || dirPath.endsWith('.js') || dirPath.endsWith('.cjs')) {
        callback(path.join(dir, f));
      }
    }
  });
}

const rootDir = path.resolve(__dirname, '..');
walk(rootDir, function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Match optional leading spaces/tabs and then the comment
  let newContent = content.replace(/[ \t]*\/\/\s*FIX:\s*Bug\s*\d+/g, '');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated', filePath);
  }
});
