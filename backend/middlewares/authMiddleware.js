// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');

module.exports = async (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido ou mal formatado.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente!');
        return res.status(500).json({ erro: 'Erro de configuração de segurança do servidor.' });
    }

    try {
        const tokenLimpo = authHeader.replace('Bearer ', '').trim();
        const decodificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET);

        // Consulta de segurança em tempo real para verificar se o usuário está bloqueado
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('is_bloqueado')
            .eq('id', decodificado.id)
            .single();

        if (error || !usuario) {
            return res.status(401).json({ erro: 'Usuário não encontrado no sistema.' });
        }

        if (usuario.is_bloqueado) {
            return res.status(403).json({ erro: 'Sua conta foi suspensa. Entre em contato com a coordenação.' });
        }

        req.usuario = decodificado;
        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
    }
};