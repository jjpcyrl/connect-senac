// backend/routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/cursoController');

// Importando os nossos seguranças
const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// ----------------------------------------------------------------------
// Rota Pública: Qualquer visitante pode ver a vitrine de cursos e procedimentos
// ----------------------------------------------------------------------
router.get('/ativos', cursoController.listarAtivos);
// Apenas Admin e Coordenador podem alterar ou arquivar os cursos
router.get('/admin', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.listarTodosAdmin);

router.put('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.atualizar);
router.delete('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.arquivar);

// ----------------------------------------------------------------------
// Rotas Protegidas: Apenas a coordenação e a administração podem criar cursos
// ----------------------------------------------------------------------
router.post(
    '/',
    authMiddleware,
    autorizarPerfis('admin', 'coordenador'), // <-- O RBAC EM AÇÃO AQUI!
    cursoController.criar
);

module.exports = router;