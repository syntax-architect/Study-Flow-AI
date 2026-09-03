const fs = require('fs');
let code = fs.readFileSync('server/lib/supabase.ts', 'utf8');

if (!code.includes('export const adminSupabase')) {
  code += `\nexport const adminSupabase = createClient(
  supabaseUrl,
  supabaseAdminKey || supabaseKey, // Fallback if no admin key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);\n`;
}
fs.writeFileSync('server/lib/supabase.ts', code);
console.log('Added adminSupabase.');
