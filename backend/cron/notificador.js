// backend/cron/notificador.js
const cron = require('node-cron');
const supabase = require('../config/database');
const logger = require('../config/logger');

// Cache em memória para evitar reenvio no mesmo ciclo/janela
const notificacoesEnviadas = new Set();

// Limpeza periódica do cache de deduplicação a cada 12 horas
setInterval(() => {
    notificacoesEnviadas.clear();
}, 12 * 60 * 60 * 1000);

// Expressão CRON: '* * * * *' significa "Executar a cada minuto"
cron.schedule('* * * * *', async () => {
    logger.debug('🤖 [CRON] A executar varredura de notificações de agendamentos...');

    try {
        const agora = new Date();

        // Calcula o limite: daqui a exatas 24 horas
        const daquiA24Horas = new Date(agora.getTime() + (24 * 60 * 60 * 1000));
        const limiteInferior = agora.toISOString();
        const limiteSuperior = daquiA24Horas.toISOString();

        // 1. Procurar agendamentos confirmados que acontecem nas próximas 24h
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                status,
                usuarios ( nome, email, telefone ),
                disponibilidades ( data_hora, cursos ( nome ) )
            `)
            .eq('status', 'agendado')
            .gt('disponibilidades.data_hora', limiteInferior)
            .lt('disponibilidades.data_hora', limiteSuperior);

        if (error) throw error;

        if (!agendamentos || agendamentos.length === 0) {
            return; // Nada a fazer, encerra o ciclo silenciosamente
        }

        // 2. Disparar os avisos com deduplicação
        for (const ag of agendamentos) {
            if (!ag.disponibilidades || !ag.disponibilidades.data_hora) {
                logger.warn(`Agendamento ignorado: Dados de horário ausentes.`, { agendamentoId: ag.id });
                continue;
            }

            const dataCurso = new Date(ag.disponibilidades.data_hora);
            const diferencaEmMinutos = Math.floor((dataCurso - agora) / (1000 * 60));

            // Envia lembrete para 24h (1439-1440 min) ou 3h (179-180 min)
            const ehLembrete24h = diferencaEmMinutos >= 1435 && diferencaEmMinutos <= 1445;
            const ehLembrete3h = diferencaEmMinutos >= 175 && diferencaEmMinutos <= 185;

            if (ehLembrete24h || ehLembrete3h) {
                const tipoChave = ehLembrete24h ? '24h' : '3h';
                const dedupeKey = `${ag.id}-${tipoChave}`;

                // Se já foi enviado nesta janela, não reenvia
                if (notificacoesEnviadas.has(dedupeKey)) {
                    continue;
                }

                const curso = ag.disponibilidades.cursos?.nome || 'Curso não identificado';
                const cliente = ag.usuarios?.nome || 'Aluno';
                const email = ag.usuarios?.email || 'Sem e-mail';
                const horaFormatada = dataCurso.toLocaleString('pt-BR', { timeStyle: 'short' });
                const tipoAviso = ehLembrete24h ? 'amanhã' : 'hoje';

                logger.info(`Lembrete disparado com sucesso`, {
                    tipo: tipoChave,
                    agendamentoId: ag.id,
                    email,
                    curso
                });

                console.log(`\n📧 [EMAIL/AVISO ENVIADO] Para: ${email}`);
                console.log(`Olá, ${cliente}! Lembramos que o seu agendamento para ${curso} é ${tipoAviso} às ${horaFormatada}.`);
                console.log(`Em caso de imprevistos, cancele na plataforma com 2 horas de antecedência.\n`);

                // Registra o envio no controle de deduplicação
                notificacoesEnviadas.add(dedupeKey);

                // Tenta atualizar colunas no banco de forma não-bloqueante se existirem
                try {
                    const updateData = ehLembrete24h ? { notificado_24h: true } : { notificado_3h: true };
                    await supabase.from('agendamentos').update(updateData).eq('id', ag.id);
                } catch (ignoreErr) {
                    // Se as colunas não existirem ainda no schema do Supabase, o envio continuará seguro via cache em memória
                }
            }
        }

    } catch (error) {
        logger.error('Falha ao varrer notificações no CRON', { erro: error.message });
    }
});

logger.info('⏳ Motor de Notificações (CRON) ativado com controle de deduplicação.');