const fs = require('fs');
let code = fs.readFileSync('server/database/supabase_setup.sql', 'utf8');
if (!code.includes('idx_documents_fts')) {
    code = code + '\nCREATE INDEX IF NOT EXISTS idx_documents_fts ON public.documents USING GIN (fts);\n';
    fs.writeFileSync('server/database/supabase_setup.sql', code);
}
console.log('Index added');
