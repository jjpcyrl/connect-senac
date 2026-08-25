// backend/config/database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Buscando as variáveis de ambiente protegidas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: Credenciais do Supabase (SUPABASE_URL / SUPABASE_KEY) ausentes no .env ou nas Environment Variables da Vercel.');
    if (!process.env.VERCEL) {
        process.exit(1);
    }
}

// Criando a instância de conexão com o banco de dados
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : {
        from: () => ({
            select: () => Promise.resolve({ data: null, error: { message: 'Configuração do Supabase ausente na Vercel (SUPABASE_URL/SUPABASE_KEY).' } }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Configuração do Supabase ausente na Vercel (SUPABASE_URL/SUPABASE_KEY).' } }),
            update: () => Promise.resolve({ data: null, error: { message: 'Configuração do Supabase ausente na Vercel (SUPABASE_URL/SUPABASE_KEY).' } }),
            delete: () => Promise.resolve({ data: null, error: { message: 'Configuração do Supabase ausente na Vercel (SUPABASE_URL/SUPABASE_KEY).' } }),
        })
    };

if (supabaseUrl && supabaseKey) {
    console.log('Conectado ao Supabase (PostgreSQL) com sucesso!');
}

// Exportamos a instância para ser usada pelos Controllers
module.exports = supabase;