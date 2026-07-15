// backend/controllers/profissionalController.js
const supabase = require('../config/database');

exports.minhasTurmas = async (req, res) => {
    // O authMiddleware pendurou o ID do utilizador (Professor) na requisição
    const profissional_id = req.usuario.id;

    try {
        const { data: cursos, error } = await supabase
            .from('cursos')
            .select(`
                id, nome,
                disponibilidades (
                    id, data_hora, vagas_totais, vagas_ocupadas,
                    agendamentos (
                        id, status,
                        usuarios ( nome, telefone, email )
                    )
                )
            `)
            .eq('profissional_id', profissional_id)
            .eq('status', 'ativo')
            .order('data_hora', { foreignTable: 'disponibilidades', ascending: true });

        if (error) throw error;

        res.json(cursos);
    } catch (error) {
        console.error('Erro ao buscar turmas do professor:', error.message);
        res.status(500).json({ erro: 'Erro ao carregar as suas listas de modelos.' });
    }
};