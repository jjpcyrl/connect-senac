// tests/auth.security.test.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'teste_jwt_secret_definido_para_testes_seguros_123';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../backend/config/database', () => ({
    from: jest.fn()
}));

const supabase = require('../backend/config/database');
const app = require('../server');

describe('🛡️ [SECURITY] Testes de Integridade de Autenticação, LGPD e Controles Administrativos', () => {
    const JWT_SECRET = process.env.JWT_SECRET;

    const tokenAdmin = jwt.sign(
        { id: 'admin-uuid-1', email: 'admin@teste.com', perfil: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('AUTH-SEC-01: Não deve permitir registro se o consentimento LGPD for falso', async () => {
        const res = await request(app)
            .post('/api/usuarios/registrar')
            .send({
                nome: 'João Silva',
                email: 'joao@teste.com',
                senha: 'SenhaForte123!',
                confirmar_senha: 'SenhaForte123!',
                consentimento_termos: false
            });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/LGPD|termos/i);
    });

    test('AUTH-SEC-02: Não deve permitir registro com confirmação de senha divergente', async () => {
        const res = await request(app)
            .post('/api/usuarios/registrar')
            .send({
                nome: 'João Silva',
                email: 'joao@teste.com',
                senha: 'SenhaForte123!',
                confirmar_senha: 'OutraSenha123!',
                consentimento_termos: true
            });
        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/não coincidem/i);
    });

    test('AUTH-SEC-03: Impedir que o administrador bloqueie sua própria conta (Auto-bloqueio)', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
        });

        const res = await request(app)
            .put('/api/admin/usuarios/admin-uuid-1/bloquear')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ is_bloqueado: true });

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/não pode bloquear sua própria conta/i);
    });

    test('AUTH-SEC-04: Impedir criação de disponibilidade com data no passado', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
        });

        const dataPassada = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Ontem

        const res = await request(app)
            .post('/api/disponibilidades')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                curso_id: 'curso-123',
                data_hora: dataPassada,
                vagas_totais: 10
            });

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/futura/i);
    });

    test('AUTH-SEC-05: Impedir criação de disponibilidade com número de vagas negativo ou zero', async () => {
        supabase.from.mockImplementation((table) => {
            if (table === 'usuarios') {
                return {
                    select: () => ({ eq: () => ({ single: async () => ({ data: { is_bloqueado: false }, error: null }) }) })
                };
            }
        });

        const dataFutura = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const res = await request(app)
            .post('/api/disponibilidades')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                curso_id: 'curso-123',
                data_hora: dataFutura,
                vagas_totais: -5
            });

        expect(res.status).toBe(400);
        expect(res.body.erro).toMatch(/positivo/i);
    });
});