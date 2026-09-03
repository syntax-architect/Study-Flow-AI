import { runAllChecks } from '../server/diagnostics/checks';

const reset = "\x1b[0m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";

const color = (status: string) => {
  if (status === 'pass') return green;
  if (status === 'warn') return yellow;
  if (status === 'fail') return red;
  return reset;
};

const run = async () => {
  console.log(`${bold}Starting System Diagnostics...${reset}\n`);
  const startTime = Date.now();
  
  const results = await runAllChecks();
  
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  
  console.log(`${bold}--- DIAGNOSTIC SUMMARY ---${reset}`);
  console.log(`${passed}/${total} PASSED, ${warned} WARNINGS, ${failed} FAILURES`);
  console.log(`Total Time: ${Date.now() - startTime}ms\n`);
  
  results.forEach(res => {
    const c = color(res.status);
    console.log(`${c}${bold}[${res.status.toUpperCase()}]${reset} ${res.name} ${dim}(${res.latencyMs}ms)${reset}`);
    console.log(`    Message: ${res.message}`);
    
    if (res.errorCategory) {
      console.log(`    Category: ${red}${res.errorCategory}${reset}`);
    }
    if (res.suggestedFix) {
      console.log(`    Suggested Fix: ${yellow}${res.suggestedFix}${reset}`);
    }
    console.log('');
  });
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

run().catch(err => {
  console.error('Diagnostic script crashed:', err);
  process.exit(1);
});
