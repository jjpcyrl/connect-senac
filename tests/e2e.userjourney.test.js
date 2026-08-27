// tests/e2e.userjourney.test.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste_jwt_secret_definido_para_testes_seguros_123';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Mock do Supabase para simulação total e determinística
jest.mock('../backend/config/database', () => ({
    from: jest.fn()
}));

const supabase = require('../backend/config/database');
const app = require('../server');

describe('🚀 [USER JOURNEY E2E SUITE] Execução de Todos os Cenários (TC-01 a TC-42)', () => {
    const JWT_SECRET = process.env.JWT_SECRET;

    // Tokens de autenticação dos diferentes perfis
    const tokenCandidato = jwt.sign(
        { id: 'candidato-uuid-1', email: 'candidato.qa@senac.com', perfil: 'candidato' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    const tokenProfissional = jwt.sign(
        { id: 'prof-uuid-1', email: 'prof.qa@senac.com', perfil: 'profissional' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    const tokenAdmin = jwt.sign(
        { id: 'admin-uuid-1', email: 'admin.qa@senac.com', perfil: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    const tokenCoordenador = jwt.sign(
        { id: 'coord-uuid-1', email: 'coord.qa@senac.com', perfil: 'coordenador' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =========================================================================
    // MÓDULO 1 — CADASTRO E AUTENTICAÇÃO (TC-01 a TC-15)
    // =========================================================================
    describe('MÓDULO 1 — CADASTRO E AUTENTICAÇÃO', () => {
        test('TC-01 | CP  | Cadastro com todos os dados válidos → 201 Created', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
                        insert: () => ({ select: () => ({ data: [{ id: 'novo-uuid-1' }], error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/registrar')
                .send({
                    nome: 'Candidato Teste QA',
                    email: 'novo.candidato@senac.com',
                    telefone: '(11) 98765-4321',
                    senha: 'Senha@123',
                    confirmar_senha: 'Senha@123',
                    consentimento_termos: true,
                    consentimento_imagem: true
                });

            expect(res.status).toBe(201);
            expect(res.body.mensagem).toMatch(/registado com sucesso/i);
        });

        test('TC-02 | NEG | Cadastro com senhas diferentes → 400 Bad Request', async () => {
            const res = await request(app)
                .post('/api/usuarios/registrar')
                .send({
                    nome: 'Usuário Divergente QA',
                    email: 'divergente@senac.com',
                    telefone: '(11) 98888-7777',
                    senha: 'Senha@123',
                    confirmar_senha: 'OutraSenha@999',
                    consentimento_termos: true
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/não coincidem/i);
        });

        test('TC-03 | NEG | Cadastro com e-mail já cadastrado → 400 Bad Request', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'user-existente' }, error: null }) }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/registrar')
                .send({
                    nome: 'Candidato Duplicado',
                    email: 'candidato.qa@senac.com',
                    senha: 'Senha@123',
                    confirmar_senha: 'Senha@123',
                    consentimento_termos: true
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/já está em uso/i);
        });

        test('TC-04 | NEG | Cadastro sem aceitar termos (LGPD) → 400 Bad Request', async () => {
            const res = await request(app)
                .post('/api/usuarios/registrar')
                .send({
                    nome: 'Sem LGPD',
                    email: 'semlgpd@senac.com',
                    senha: 'Senha@123',
                    confirmar_senha: 'Senha@123',
                    consentimento_termos: false
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/LGPD|termos/i);
        });

        test('TC-05 | CP  | Login como candidato → 200 + token + perfil candidato', async () => {
            const hashSenha = await bcrypt.hash('Senha@123', 10);
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'candidato-uuid-1',
                                        nome: 'Candidato QA',
                                        email: 'candidato.qa@senac.com',
                                        senha: hashSenha,
                                        perfil: 'candidato',
                                        is_bloqueado: false
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'candidato.qa@senac.com', senha: 'Senha@123' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.utilizador.perfil).toBe('candidato');
        });

        test('TC-06 | CP  | Login como profissional → 200 + token + perfil profissional', async () => {
            const hashSenha = await bcrypt.hash('Senha@123', 10);
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'prof-uuid-1',
                                        nome: 'Prof QA',
                                        email: 'prof.qa@senac.com',
                                        senha: hashSenha,
                                        perfil: 'profissional',
                                        is_bloqueado: false
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'prof.qa@senac.com', senha: 'Senha@123' });

            expect(res.status).toBe(200);
            expect(res.body.utilizador.perfil).toBe('profissional');
        });

        test('TC-07 | CP  | Login como admin → 200 + token + perfil admin', async () => {
            const hashSenha = await bcrypt.hash('Senha@123', 10);
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'admin-uuid-1',
                                        nome: 'Admin QA',
                                        email: 'admin.qa@senac.com',
                                        senha: hashSenha,
                                        perfil: 'admin',
                                        is_bloqueado: false
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'admin.qa@senac.com', senha: 'Senha@123' });

            expect(res.status).toBe(200);
            expect(res.body.utilizador.perfil).toBe('admin');
        });

        test('TC-08 | NEG | Login com senha incorreta → 401 Unauthorized', async () => {
            const hashSenha = await bcrypt.hash('SenhaCorreta@123', 10);
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'user-1',
                                        email: 'candidato.qa@senac.com',
                                        senha: hashSenha,
                                        is_bloqueado: false
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'candidato.qa@senac.com', senha: 'SenhaErrada@999' });

            expect(res.status).toBe(401);
            expect(res.body.erro).toMatch(/incorreta/i);
        });

        test('TC-09 | NEG | Login com usuário inexistente → 404 Not Found', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'inexistente@senac.com', senha: 'Senha@123' });

            expect(res.status).toBe(404);
            expect(res.body.erro).toMatch(/não encontrado/i);
        });

        test('TC-10 | NEG | Login com conta bloqueada → 403 Forbidden', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'bloqueado-1',
                                        email: 'bloqueado@senac.com',
                                        is_bloqueado: true
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/login')
                .send({ email: 'bloqueado@senac.com', senha: 'Senha@123' });

            expect(res.status).toBe(403);
            expect(res.body.erro).toMatch(/suspensa|bloquead/i);
        });

        test('TC-11 | CP  | Solicitar recuperação de senha (e-mail existente) → 200 genérico', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'user-1', nome: 'QA' }, error: null }) }) }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/esqueci-senha')
                .send({ email: 'candidato.qa@senac.com' });

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/link de recuperação/i);
        });

        test('TC-12 | EC  | Solicitar recuperação com e-mail inexistente → 200 genérico (anti-enumeração)', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/esqueci-senha')
                .send({ email: 'naocadastrado@senac.com' });

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/link de recuperação/i);
        });

        test('TC-13 | CP  | Redefinir senha com token válido → 200 sucesso', async () => {
            const rawToken = 'token_secreto_valido_123';
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                gt: () => ({
                                    maybeSingle: async () => ({ data: { id: 'user-1' }, error: null })
                                })
                            })
                        }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/redefinir-senha')
                .send({
                    token: rawToken,
                    nova_senha: 'NovaSenha@123',
                    confirmar_senha: 'NovaSenha@123'
                });

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/alterada com sucesso/i);
        });

        test('TC-14 | NEG | Redefinir senha com token expirado/inválido → 400 Bad Request', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({
                            eq: () => ({
                                gt: () => ({
                                    maybeSingle: async () => ({ data: null, error: null })
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/usuarios/redefinir-senha')
                .send({
                    token: 'token_invalido_ou_expirado',
                    nova_senha: 'NovaSenha@123',
                    confirmar_senha: 'NovaSenha@123'
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/inválido ou já expirou/i);
        });

        test('TC-15 | EC  | Chamada à API protegida sem token (painel sem token) → 401 Unauthorized', async () => {
            const res = await request(app)
                .get('/api/agendamentos/meus');

            expect(res.status).toBe(401);
            expect(res.body.erro).toMatch(/Acesso negado/i);
        });
    });

    // =========================================================================
    // MÓDULO 2 — VITRINE DE CURSOS (TC-16 a TC-18)
    // =========================================================================
    describe('MÓDULO 2 — VITRINE DE CURSOS (CANDIDATO)', () => {
        test('TC-16 | CP  | Acessar cursos ativos logado → Retorna lista de cursos ativos', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                    };
                }
                if (table === 'cursos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                order: async () => ({
                                    data: [{ id: 'curso-1', nome: 'Corte e Escova', status: 'ativo' }],
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .get('/api/cursos/ativos')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].nome).toBe('Corte e Escova');
        });

        test('TC-17 | CP  | Obter detalhes de horários disponíveis de um curso (Saber mais) → 200', async () => {
            const dataFutura = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'disponibilidades') {
                    return {
                        select: () => ({
                            eq: () => ({
                                gt: () => ({
                                    order: async () => ({
                                        data: [{ id: 'disp-1', data_hora: dataFutura, vagas_totais: 5, vagas_ocupadas: 2 }],
                                        error: null
                                    })
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .get('/api/disponibilidades/curso/curso-1')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].vagas_ocupadas).toBe(2);
        });

        test('TC-18 | EC  | Vitrine sem cursos cadastrados → Retorna array vazio []', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                    };
                }
                if (table === 'cursos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                order: async () => ({ data: [], error: null })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .get('/api/cursos/ativos')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    // =========================================================================
    // MÓDULO 3 — AGENDAMENTO (TC-19 a TC-25)
    // =========================================================================
    describe('MÓDULO 3 — AGENDAMENTO (CANDIDATO)', () => {
        test('TC-19 | CP  | Agendar em horário disponível com vagas → 201 Created', async () => {
            const dataFutura = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'disponibilidades') {
                    return {
                        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'disp-1', data_hora: dataFutura, vagas_totais: 5, vagas_ocupadas: 2 }, error: null }) }) }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
                if (table === 'agendamentos') {
                    return {
                        insert: () => ({ select: () => ({ data: [{ id: 'agend-1', status: 'agendado' }], error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({ disponibilidade_id: 'disp-1' });

            expect(res.status).toBe(201);
            expect(res.body.mensagem).toMatch(/sucesso/i);
        });

        test('TC-20 | NEG | Tentar agendar no mesmo horário novamente → 400 Duplicidade (23505)', async () => {
            const dataFutura = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'disponibilidades') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'disp-1', data_hora: dataFutura, vagas_totais: 5, vagas_ocupadas: 2 }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        insert: () => ({ select: () => ({ data: null, error: { code: '23505' } }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({ disponibilidade_id: 'disp-1' });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/já está agendado/i);
        });

        test('TC-21 | NEG | Tentar agendar em horário sem vagas (Overbooking) → 400 Bad Request', async () => {
            const dataFutura = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'disponibilidades') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'disp-1', data_hora: dataFutura, vagas_totais: 5, vagas_ocupadas: 5 }, error: null }) }) }) };
                }
            });

            const res = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({ disponibilidade_id: 'disp-1' });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/não há mais vagas/i);
        });

        test('TC-22 | NEG | Tentar agendar horário já passado → 400 Erro Temporal', async () => {
            const dataPassada = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'disponibilidades') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'disp-1', data_hora: dataPassada, vagas_totais: 5, vagas_ocupadas: 0 }, error: null }) }) }) };
                }
            });

            const res = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({ disponibilidade_id: 'disp-1' });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/já passaram/i);
        });

        test('TC-23 | CP  | Cancelar agendamento com mais de 2h de antecedência → 200 Sucesso', async () => {
            const dataMaisDeDuasHoras = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(); // 5 horas no futuro
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    single: async () => ({
                                        data: {
                                            id: 'agend-1',
                                            status: 'agendado',
                                            disponibilidades: { id: 'disp-1', data_hora: dataMaisDeDuasHoras, vagas_ocupadas: 3 }
                                        },
                                        error: null
                                    })
                                })
                            })
                        }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
                if (table === 'disponibilidades') {
                    return { update: () => ({ eq: async () => ({ error: null }) }) };
                }
            });

            const res = await request(app)
                .put('/api/agendamentos/agend-1/cancelar')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/cancelado com sucesso/i);
        });

        test('TC-24 | NEG | Tentar cancelar com menos de 2h de antecedência → 403 Forbidden', async () => {
            const dataMenosDeDuasHoras = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora no futuro
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    single: async () => ({
                                        data: {
                                            id: 'agend-1',
                                            status: 'agendado',
                                            disponibilidades: { id: 'disp-1', data_hora: dataMenosDeDuasHoras, vagas_ocupadas: 3 }
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
                .put('/api/agendamentos/agend-1/cancelar')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(403);
            expect(res.body.erro).toMatch(/2 horas/i);
        });

        test('TC-25 | NEG | Tentar cancelar agendamento de outro usuário → 404 Not Found', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    single: async () => ({ data: null, error: null })
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .put('/api/agendamentos/agend-alheio/cancelar')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(404);
            expect(res.body.erro).toMatch(/não encontrado ou não pertence a você/i);
        });
    });

    // =========================================================================
    // MÓDULO 4 — AVALIAÇÃO / FEEDBACK (TC-26 a TC-29)
    // =========================================================================
    describe('MÓDULO 4 — AVALIAÇÃO / FEEDBACK (CANDIDATO)', () => {
        test('TC-26 | CP  | Enviar feedback (nota 1–5) para agendamento "concluido" → 201 Created', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({ data: { status: 'concluido', usuario_id: 'candidato-uuid-1' }, error: null })
                            })
                        })
                    };
                }
                if (table === 'feedbacks') {
                    return {
                        insert: () => ({ select: () => ({ data: [{ id: 'feed-1', nota: 5 }], error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/feedbacks')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({
                    agendamento_id: 'agend-concluido-1',
                    nota: 5,
                    comentario: 'Excelente atendimento!'
                });

            expect(res.status).toBe(201);
            expect(res.body.mensagem).toMatch(/registada/i);
        });

        test('TC-27 | NEG | Tentar enviar segundo feedback para o mesmo agendamento → 400 Duplicidade (23505)', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({ data: { status: 'concluido', usuario_id: 'candidato-uuid-1' }, error: null })
                            })
                        })
                    };
                }
                if (table === 'feedbacks') {
                    return {
                        insert: () => ({ select: () => ({ data: null, error: { code: '23505' } }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/feedbacks')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({
                    agendamento_id: 'agend-concluido-1',
                    nota: 4,
                    comentario: 'Tentando avaliar de novo'
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/Já enviou uma avaliação/i);
        });

        test('TC-28 | NEG | Tentar enviar feedback para agendamento ainda "agendado" → 400 Bloqueado', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({ data: { status: 'agendado', usuario_id: 'candidato-uuid-1' }, error: null })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .post('/api/feedbacks')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({
                    agendamento_id: 'agend-ativo-1',
                    nota: 5,
                    comentario: 'Muito bom'
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/já foram concluídos/i);
        });

        test('TC-29 | NEG | Enviar nota fora do intervalo (0 ou 6) → 400 Erro de Validação', async () => {
            const res = await request(app)
                .post('/api/feedbacks')
                .set('Authorization', `Bearer ${tokenCandidato}`)
                .send({
                    agendamento_id: 'agend-1',
                    nota: 6,
                    comentario: 'Nota inválida'
                });

            expect(res.status).toBe(400);
            expect(res.body.erro).toMatch(/entre 1 e 5/i);
        });
    });

    // =========================================================================
    // MÓDULO 5 — PAINEL DO PROFISSIONAL (TC-30 a TC-32)
    // =========================================================================
    describe('MÓDULO 5 — PAINEL DO PROFISSIONAL', () => {
        test('TC-30 | CP  | Profissional logado vê suas turmas com lista de inscritos → 200', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'cursos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    order: async () => ({
                                        data: [{ id: 'curso-prof-1', nome: 'Barbearia', disponibilidades: [] }],
                                        error: null
                                    })
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .get('/api/profissional/minhas-turmas')
                .set('Authorization', `Bearer ${tokenProfissional}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('TC-31 | CP  | Profissional conclui agendamento de modelo → status muda para "concluido"', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: 'agend-1',
                                        status: 'agendado',
                                        disponibilidades: { cursos: { profissional_id: 'prof-uuid-1' } }
                                    },
                                    error: null
                                })
                            })
                        }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
            });

            const res = await request(app)
                .put('/api/profissional/agendamentos/agend-1/concluir')
                .set('Authorization', `Bearer ${tokenProfissional}`);

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/concluído com sucesso/i);
        });

        test('TC-32 | NEG | Profissional tenta concluir agendamento de outro professor → 403 Forbidden', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => ({
                                    data: {
                                        id: 'agend-1',
                                        status: 'agendado',
                                        disponibilidades: { cursos: { profissional_id: 'outro-prof-id' } }
                                    },
                                    error: null
                                })
                            })
                        })
                    };
                }
            });

            const res = await request(app)
                .put('/api/profissional/agendamentos/agend-1/concluir')
                .set('Authorization', `Bearer ${tokenProfissional}`);

            expect(res.status).toBe(403);
            expect(res.body.erro).toMatch(/outro professor/i);
        });
    });

    // =========================================================================
    // MÓDULO 6 — PAINEL ADMIN (TC-33 a TC-38)
    // =========================================================================
    describe('MÓDULO 6 — PAINEL ADMIN', () => {
        test('TC-33 | CP  | Admin cria novo curso com dados válidos → 201 Created', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'cursos') {
                    return {
                        insert: () => ({ select: () => ({ data: [{ id: 'novo-curso-1', nome: 'Manicure Profissional' }], error: null }) })
                    };
                }
            });

            const res = await request(app)
                .post('/api/cursos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    nome: 'Manicure Profissional',
                    descricao: 'Aprenda técnicas de esmaltação',
                    profissional_id: 'prof-uuid-1'
                });

            expect(res.status).toBe(201);
            expect(res.body.mensagem).toMatch(/criado com sucesso/i);
        });

        test('TC-34 | CP  | Admin edita curso existente → 200 Sucesso', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'cursos') {
                    return {
                        update: () => ({ eq: () => ({ select: () => ({ data: [{ id: 'curso-1', nome: 'Manicure Avançada' }], error: null }) }) })
                    };
                }
            });

            const res = await request(app)
                .put('/api/cursos/curso-1')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nome: 'Manicure Avançada', descricao: 'Novas técnicas', profissional_id: 'prof-uuid-1' });

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/atualizado com sucesso/i);
        });

        test('TC-35 | CP  | Admin arquiva curso → status arquivado', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'cursos') {
                    return {
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
            });

            const res = await request(app)
                .delete('/api/cursos/curso-1')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/arquivado/i);
        });

        test('TC-36 | CP  | Admin cancela agendamento de qualquer candidato sem restrição de tempo → 200', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
                if (table === 'agendamentos') {
                    return {
                        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'agend-1', status: 'agendado', disponibilidades: { id: 'disp-1', vagas_ocupadas: 2 } }, error: null }) }) }),
                        update: () => ({ eq: async () => ({ error: null }) })
                    };
                }
                if (table === 'disponibilidades') {
                    return { update: () => ({ eq: async () => ({ error: null }) }) };
                }
            });

            const res = await request(app)
                .put('/api/agendamentos/admin/agend-1/cancelar')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/cancelado forçadamente/i);
        });

        test('TC-37 | CP  | Admin bloqueia usuário → 200 e altera status', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return {
                        select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }),
                        update: () => ({ eq: () => ({ select: () => ({ data: [{ id: 'user-alvo', is_bloqueado: true }], error: null }) }) })
                    };
                }
            });

            const res = await request(app)
                .put('/api/admin/usuarios/user-alvo/bloquear')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ is_bloqueado: true });

            expect(res.status).toBe(200);
            expect(res.body.mensagem).toMatch(/bloqueado com sucesso/i);
        });

        test('TC-38 | NEG | Coordenador tenta acessar funcionalidade exclusiva de admin (criar colaborador) → 403', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
            });

            const res = await request(app)
                .post('/api/admin/colaboradores')
                .set('Authorization', `Bearer ${tokenCoordenador}`)
                .send({
                    nome: 'Novo Coord',
                    email: 'coord2@senac.com',
                    telefone: '123',
                    senha: '123',
                    perfil: 'coordenador'
                });

            expect(res.status).toBe(403);
            expect(res.body.erro).toMatch(/Acesso restrito/i);
        });
    });

    // =========================================================================
    // MÓDULO 7 — SEGURANÇA E SESSÃO (TC-39 a TC-42)
    // =========================================================================
    describe('MÓDULO 7 — SEGURANÇA E SESSÃO', () => {
        test('TC-39 | EC  | Chamada à API /cursos/ativos sem token → 401 Unauthorized', async () => {
            const res = await request(app).get('/api/cursos/ativos');
            expect(res.status).toBe(401);
            expect(res.body.erro).toMatch(/Acesso negado/i);
        });

        test('TC-40 | EC  | Chamada à API com token expirado (manipulado) → 401 Unauthorized', async () => {
            const tokenExpirado = jwt.sign(
                { id: 'user-1', email: 'expirado@senac.com', perfil: 'candidato' },
                JWT_SECRET,
                { expiresIn: '-1s' }
            );

            const res = await request(app)
                .get('/api/cursos/ativos')
                .set('Authorization', `Bearer ${tokenExpirado}`);

            expect(res.status).toBe(401);
            expect(res.body.erro).toMatch(/expirada ou inválida/i);
        });

        test('TC-41 | EC  | Candidato tenta chamar rota de admin diretamente → 403 Forbidden', async () => {
            supabase.from.mockImplementation((table) => {
                if (table === 'usuarios') {
                    return { select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) }) };
                }
            });

            const res = await request(app)
                .get('/api/admin/usuarios')
                .set('Authorization', `Bearer ${tokenCandidato}`);

            expect(res.status).toBe(403);
            expect(res.body.erro).toMatch(/Acesso restrito/i);
        });

        test('TC-42 | CP  | Simulação de Logout (validação de token limpo e status)', async () => {
            // No frontend, o logout remove o token do localStorage. No backend, uma rota pública como /status permanece 200 OK sem token
            const res = await request(app).get('/api/status');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('OK');
        });
    });
});
