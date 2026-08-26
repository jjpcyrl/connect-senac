// tests/agendamento.security.test.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste_jwt_secret_definido_para_testes_seguros_123';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock do Supabase para execução isolada e determinística
jest.mock('../backend/config/database', () => {
    return {
        from: jest.fn()
    };
});

const supabase = require('../backend/config/database');
const app = require('../server');

describe('🛡️ [SECURITY & INTEGRATION] Testes do Módulo de Agendamentos & RBAC', () => {
    const JWT_SECRET = process.env.JWT_SECRET;
    
    const tokenCandidato = jwt.sign(
        { id: 'user-uuid-1', email: 'candidato@teste.com', perfil: 'candidato' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    const tokenAdmin = jwt.sign(
        { id: 'admin-uuid-1', email: 'admin@teste.com', perfil: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    const tokenProfissional = jwt.sign(
        { id: 'prof-uuid-1', email: 'prof@teste.com', perfil: 'profissional' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('TC-01: Não deve permitir cancelamento com menos de 2 horas de antecedência', async () => {
        const dataMenosDeDuasHoras = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h no futuro
        
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
            if (table === 'agendamentos') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: 'agend-123',
                                        status: 'agendado',
                                        disponibilidades: {
                                            id: 'disp-123',
                                            data_hora: dataMenosDeDuasHoras,
                                            vagas_ocupadas: 5
                                        }
                                    },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
        });

        const res = await request(app)
            .put('/api/agendamentos/agend-123/cancelar')
            .set('Authorization', `Bearer ${tokenCandidato}`);

        expect(res.status).toBe(403);
        expect(res.body.erro).toMatch(/2 horas/i);
    });

    test('TC-02: Não deve permitir cancelamento de curso que já foi realizado (Passado)', async () => {
        const dataPassada = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Ontem
        
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
            if (table === 'agendamentos') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: 'agend-passado',
                                        status: 'agendado',
                                        disponibilidades: {
                                            id: 'disp-passado',
                                            data_hora: dataPassada,
                                            vagas_ocupadas: 2
                                        }
                                    },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
        });

        const res = await request(app)
            .put('/api/agendamentos/agend-passado/cancelar')
            .set('Authorization', `Bearer ${tokenCandidato}`);

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/já foi realizado/i);
    });

    test('TC-03: RBAC - Bloquear acesso de candidato à rota de cancelamento forçado admin', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
        });

        const res = await request(app)
            .put('/api/agendamentos/admin/agend-123/cancelar')
            .set('Authorization', `Bearer ${tokenCandidato}`);

        expect(res.status).toBe(403);
        expect(res.body.erro).toMatch(/Acesso restrito/i);
    });

    test('TC-04: Bloquear criação de agendamento em horário retroativo (No passado)', async () => {
        const dataPassada = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hora atrás

        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
            if (table === 'disponibilidades') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: { id: 'disp-passada', data_hora: dataPassada, vagas_totais: 10, vagas_ocupadas: 2 },
                                error: null
                            })
                        })
                    })
                };
            }
        });

        const res = await request(app)
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${tokenCandidato}`)
            .send({ disponibilidade_id: 'disp-passada' });

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/já passaram/i);
    });

    test('TC-05: Bloquear criação de agendamento em horário esgotado (Anti-Overbooking)', async () => {
        const dataFutura = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Amanhã

        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
            if (table === 'disponibilidades') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: { id: 'disp-lotada', data_hora: dataFutura, vagas_totais: 10, vagas_ocupadas: 10 },
                                error: null
                            })
                        })
                    })
                };
            }
        });

        const res = await request(app)
            .post('/api/agendamentos')
            .set('Authorization', `Bearer ${tokenCandidato}`)
            .send({ disponibilidade_id: 'disp-lotada' });

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/vagas/i);
    });

    test('TC-06: Profissional - Cancelar inscrição e decrementar vagas_ocupadas', async () => {
        let updateDisponibilidadeChamado = false;

        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
            if (table === 'agendamentos') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: {
                                    id: 'agend-123',
                                    status: 'agendado',
                                    disponibilidade_id: 'disp-123',
                                    disponibilidades: {
                                        vagas_ocupadas: 4,
                                        cursos: { profissional_id: 'prof-uuid-1' }
                                    }
                                },
                                error: null
                            })
                        })
                    }),
                    update: () => ({
                        eq: async () => ({ error: null })
                    })
                };
            }
            if (table === 'disponibilidades') {
                return {
                    update: (dados) => {
                        if (dados.vagas_ocupadas === 3) {
                            updateDisponibilidadeChamado = true;
                        }
                        return {
                            eq: async () => ({ error: null })
                        };
                    }
                };
            }
        });

        const res = await request(app)
            .put('/api/profissional/agendamentos/agend-123/cancelar')
            .set('Authorization', `Bearer ${tokenProfissional}`);

        expect(res.status).toBe(200);
        expect(updateDisponibilidadeChamado).toBe(true);
    });
});