const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

code = code.replace(/await supabase\.rpc\('match_documents', \{\n\s*query_embedding,\n\s*match_threshold: 0\.3,\n\s*match_count: 3,\n\s*filter_subject: filter\?\.subject \|\| null,\n\s*filter_chapter: filter\?\.chapter \|\| null\n\s*\}\);/,
`await supabase.rpc('match_documents_hybrid', {
        query_text: query,
        query_embedding,
        match_count: 3,
        filter_subject: filter?.subject || null,
        filter_chapter: filter?.chapter || null
      });`);

code = code.replace(/await supabase\.rpc\('match_documents', \{\n\s*query_embedding,\n\s*match_threshold: 0\.3,\n\s*match_count: 5,\n\s*filter_subject: filter\?\.subject \|\| null,\n\s*filter_chapter: filter\?\.chapter \|\| null\n\s*\}\);/,
`await supabase.rpc('match_documents_hybrid', {
        query_text: query,
        query_embedding,
        match_count: 5,
        filter_subject: filter?.subject || null,
        filter_chapter: filter?.chapter || null
      });`);

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Hybrid search integrated.');
