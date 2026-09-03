const fs = require('fs');
let code = fs.readFileSync('server/controllers/db.controller.ts', 'utf8');

// replace getAuthSupabase import
if (!code.includes('adminSupabase')) {
  code = code.replace(
    'import { supabase, getAuthSupabase } from \'../lib/supabase\';',
    'import { supabase, getAuthSupabase, adminSupabase } from \'../lib/supabase\';'
  );
}

// replace getClient implementation
code = code.replace(
  'const getClient = (req: Request) => {\n  const tokenHeader = req.headers.authorization?.split(\' \')[1];\n  return getAuthSupabase(tokenHeader);\n};',
  'const getClient = (req: Request) => {\n  return adminSupabase;\n};'
);

fs.writeFileSync('server/controllers/db.controller.ts', code);
console.log('Fixed db.controller.ts');
