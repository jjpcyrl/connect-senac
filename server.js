// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const path = require('path');

// O cron só deve rodar em servidor persistente, não em funções serverless da Vercel
if (!process.env.VERCEL) {
    try {
        require('./backend/cron/notificador');
    } catch (e) {
        console.error('Aviso ao iniciar notificador cron:', e.message);
    }
}

const db = require('./backend/config/database');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');
const agendamentoRoutes = require('./backend/routes/agendamentoRoutes'); 
const cursoRoutes = require('./backend/routes/cursoRoutes'); 
const disponibilidadeRoutes = require('./backend/routes/disponibilidadeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json()); // Ensina o Express a entender requisições no formato JSON

// Entrega arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota de teste simples
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});

// Usando as rotas na API
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/disponibilidades', disponibilidadeRoutes);
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));
app.use('/api/profissional', require('./backend/routes/profissionalRoutes'));
app.use('/api/feedbacks', require('./backend/routes/feedbackRoutes'));

// Iniciando o servidor (apenas fora do ambiente Serverless da Vercel)
if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}/api/status`);
    });
}

module.exports = app;