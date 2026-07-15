// backend/routes/profissionalRoutes.js
const express = require('express');
const router = express.Router();
const profissionalController = require('../controllers/profissionalController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// A "catraca" RBAC: Apenas utilizadores com o cargo 'profissional' passam por aqui
router.get(
    '/minhas-turmas',
    authMiddleware,
    autorizarPerfis('profissional'),
    profissionalController.minhasTurmas
);

module.exports = router;