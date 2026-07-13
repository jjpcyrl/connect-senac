// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ erro: 'Acesso negado. Faça login para continuar.' });
    }

    try {
        const tokenLimpo = token.replace('Bearer ', '');
        const decodificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET || 'chave_super_secreta_senac');

        // Pendura os dados do usuário (incluindo id e perfil) na requisição
        req.usuario = decodificado;

        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Sessão expirada ou token inválido. Faça login novamente.' });
    }
};