// backend/routes/disponibilidadeRoutes.js
const express = require('express');
const router = express.Router();
const disponibilidadeController = require('../controllers/disponibilidadeController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Rota Pública: Qualquer visitante pode consultar os horários e vagas de um curso
router.get('/curso/:curso_id', disponibilidadeController.listarPorCurso);

// Apenas a administração e coordenação podem criar novas grades de horários
router.post('/', authMiddleware, autorizarPerfis('admin', 'coordenador'), disponibilidadeController.criar);

module.exports = router;