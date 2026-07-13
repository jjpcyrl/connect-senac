// backend/controllers/usuarioController.js
const supabase = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. LÓGICA DE REGISTO (CADASTRO)
exports.registrar = async (req, res) => {
    const { nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem } = req.body;

    // [Funcionalidade 1.2] Validação de Confirmação de Palavra-passe
    if (senha !== confirmar_senha) {
        return res.status(400).json({ erro: 'As palavras-passe não coincidem.' });
    }

    // Validação de LGPD
    if (!consentimento_termos) {
        return res.status(400).json({ erro: 'O consentimento dos termos de uso é obrigatório (LGPD).' });
    }

    try {
        // Verificar se o e-mail já existe no Supabase
        const { data: utilizadorExistente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle(); // Devolve o registo ou nulo se não encontrar

        if (utilizadorExistente) {
            return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
        }

        // Criptografia da palavra-passe
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Inserção de dados no Supabase
        // Nota: O UUID, a data de criação e o perfil 'candidato' são gerados automaticamente pelo Postgres!
        const { data: novoUtilizador, error: erroInsercao } = await supabase
            .from('usuarios')
            .insert([
                {
                    nome,
                    email,
                    telefone,
                    senha: senhaHash,
                    consentimento_termos: consentimento_termos === 1 || consentimento_termos === true,
                    consentimento_imagem: consentimento_imagem === 1 || consentimento_imagem === true
                }
            ])
            .select(); // Força o retorno dos dados inseridos

        if (erroInsercao) throw erroInsercao;

        res.status(201).json({ mensagem: 'Utilizador registado com sucesso!', id: novoUtilizador[0].id });
    } catch (error) {
        console.error('Erro no registo:', error.message);
        res.status(500).json({ erro: 'Erro interno ao processar o registo.' });
    }
};

// 2. LÓGICA DE LOGIN
exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Procurar o utilizador pelo e-mail no Supabase
        const { data: utilizador, error: erroBusca } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (erroBusca) throw erroBusca;
        if (!utilizador) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

        // [Funcionalidade 2.2] Verificar se o utilizador está bloqueado pela administração
        if (utilizador.is_bloqueado) {
            return res.status(403).json({ erro: 'A sua conta está temporariamente suspensa. Contacte a coordenação.' });
        }

        // Comparar a palavra-passe digitada com o Hash do banco
        const senhaValida = await bcrypt.compare(senha, utilizador.senha);
        if (!senhaValida) return res.status(401).json({ erro: 'Palavra-passe incorreta.' });

        // Gerar o Token de Autenticação (JWT)
        // Guardamos o 'id' e o 'perfil' (role) dentro do token para o sistema de permissões (RBAC)
        const token = jwt.sign(
            { id: utilizador.id, email: utilizador.email, perfil: utilizador.perfil },
            process.env.JWT_SECRET || 'chave_super_secreta_senac',
            { expiresIn: '24h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            utilizador: { nome: utilizador.nome, email: utilizador.email, perfil: utilizador.perfil }
        });
    } catch (error) {
        console.error('Erro no login:', error.message);
        res.status(500).json({ erro: 'Erro interno ao realizar o login.' });
    }
};