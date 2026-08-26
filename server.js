// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const express = require('express');
const cors = require('cors');
const path = require('path');

// O cron só deve rodar em servidor persistente, não em funções serverless da Vercel ou testes
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
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

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Segurança HTTP (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Permite carregar CDNs do Bootstrap e scripts do projeto
    crossOriginEmbedderPolicy: false
}));

// Middlewares
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json({ limit: '1mb' })); // Limita tamanho do body JSON contra payloads maliciosos

// Rate Limiting para proteção contra ataques de força bruta e DoS
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 20, // Limite de 20 tentativas por IP
    message: { erro: 'Muitas tentativas a partir deste IP. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplica limitador estrito em rotas de autenticação sensíveis
app.use('/api/usuarios/login', authLimiter);
app.use('/api/usuarios/esqueci-senha', authLimiter);

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

// Iniciando o servidor (apenas fora do ambiente Serverless da Vercel e fora de testes automatizados)
if ((require.main === module || !process.env.VERCEL) && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}/api/status`);
    });
}

module.exports = app;