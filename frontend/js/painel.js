// frontend/js/painel.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// Instâncias dos Modais do Bootstrap
const modalAgendamento = new bootstrap.Modal(document.getElementById('modalAgendamento'));
const modalFeedback = new bootstrap.Modal(document.getElementById('modalFeedback'));
const modalDetalhesCurso = new bootstrap.Modal(document.getElementById('modalDetalhesCurso'));

// ==========================================
// 1. CARREGAR A VITRINE DE CURSOS
// ==========================================
async function carregarCursos(){
    const divCursos = document.getElementById('listaCursos');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        divCursos.innerHTML = '';
        if (!cursos || cursos.length === 0) {
            divCursos.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card">
                        <div class="empty-icon-wrapper">
                            <i class="bi bi-mortarboard"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-2">Nenhum curso disponível no momento</h4>
                        <p class="text-muted small mb-0" style="max-width: 450px; margin: 0 auto;">
                            Novas turmas e vagas para modelos práticos são abertas periodicamente pelos professores. Volte em breve!
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        cursos.forEach(curso => {
            const profNome = curso.usuarios ? curso.usuarios.nome : 'Instrutor Senac';
            const local = curso.localizacao || 'Unidade Senac';
            const imagem = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80';

            const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card-curso card-custom" onclick='abrirModalDetalhesCurso(${JSON.stringify(curso).replace(/'/g, "&#39;")})' role="button" tabindex="0" aria-label="Ver detalhes de ${curso.nome}">
                        <div class="img-wrapper">
                            <img src="${imagem}" alt="${curso.nome}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'">
                            <span class="card-badge">
                                <i class="bi bi-geo-alt-fill text-warning me-1"></i>${local}
                            </span>
                        </div>
                        <div class="card-body p-4 d-flex flex-column">
                            <div class="text-muted small fw-semibold mb-1 d-flex align-items-center gap-1">
                                <i class="bi bi-person-fill text-primary"></i> ${profNome}
                            </div>
                            <h3 class="h5 fw-bold text-dark mb-2">${curso.nome}</h3>
                            <p class="card-text small text-secondary flex-grow-1 mb-4" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">
                                ${curso.descricao}
                            </p>
                            <div class="pt-2 border-top">
                                <button class="btn btn-action-more w-100" type="button">
                                    <span>Saber mais</span>
                                    <i class="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            divCursos.innerHTML += card;
        });
    } catch (error) {
        divCursos.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger rounded-4 p-4 text-center">
                    <i class="bi bi-exclamation-octagon-fill fs-3 d-block mb-2"></i>
                    <strong>Erro de Conexão:</strong> Não foi possível carregar os cursos. Verifique se o servidor está ativo.
                </div>
            </div>
        `;
    }
}

// ==========================================
// 1.5 MODAL DE DETALHES DO CURSO
// ==========================================
function abrirModalDetalhesCurso(curso){
    document.getElementById('detalheCursoNome').textContent = curso.nome;
    document.getElementById('detalheCursoProf').textContent = curso.usuarios ? curso.usuarios.nome : 'Instrutor Senac';
    document.getElementById('detalheCursoLocal').textContent = curso.localizacao || 'Unidade Senac';
    document.getElementById('detalheCursoDescricao').textContent = curso.descricao;

    document.getElementById('detalheCursoImagem').src = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80';

    const blocoRestricoes = document.getElementById('blocoRestricoes');
    if (curso.restricoes && curso.restricoes.trim() !== '') {
        blocoRestricoes.style.display = 'block';
        document.getElementById('detalheCursoRestricoes').textContent = curso.restricoes;
    } else {
        blocoRestricoes.style.display = 'none';
    }

    const btnHorarios = document.getElementById('btnIrParaHorarios');
    btnHorarios.onclick = () => {
        modalDetalhesCurso.hide();
        setTimeout(() => {
            abrirModalAgendamento(curso.id, curso.nome, curso.descricao);
        }, 400);
    };

    const divAvaliacoes = document.getElementById('detalheCursoAvaliacoes');
    divAvaliacoes.innerHTML = '<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Buscando avaliações...</div>';

    fetch(`${API_URL}/feedbacks/curso/${curso.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(feedbacks => {
            if (!feedbacks || feedbacks.length === 0) {
                divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-3">Este curso ainda não possui avaliações. Seja o primeiro a participar!</div>';
                return;
            }

            const media = (feedbacks.reduce((acc, curr) => acc + curr.nota, 0) / feedbacks.length).toFixed(1);

            let html = `
                <div class="d-flex align-items-center justify-content-between mb-3 p-2 px-3 bg-white rounded-3 border">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fs-5 fw-bold text-dark">${media}</span>
                        <span class="text-warning fs-6">★</span>
                        <span class="small text-muted">/ 5.0</span>
                    </div>
                    <span class="badge bg-primary-subtle text-primary rounded-pill small fw-semibold">${feedbacks.length} avaliações</span>
                </div>
            `;

            feedbacks.forEach(f => {
                const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
                const dataFormatada = new Date(f.created_at).toLocaleDateString('pt-BR');
                const comentarioTexto = f.comentario ? `"${f.comentario}"` : '<span class="text-muted fst-italic">Avaliação enviada sem comentário escrito.</span>';

                html += `
                    <div class="bg-white p-3 rounded-3 mb-2 border shadow-sm">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <strong class="small text-dark">${f.avaliador_nome || 'Modelo Senac'}</strong>
                            <span class="text-muted" style="font-size: 0.75rem;">${dataFormatada}</span>
                        </div>
                        <div class="mb-1 text-warning small fw-bold">${estrelas}</div>
                        <div class="small text-secondary">${comentarioTexto}</div>
                    </div>
                `;
            });
            divAvaliacoes.innerHTML = html;
        })
        .catch(() => {
            divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-2">Não foi possível carregar as avaliações no momento.</div>';
        });

    modalDetalhesCurso.show();
}

// ==========================================
// 2. FLUXO DE AGENDAMENTO (MODAL E HORÁRIOS)
// ==========================================
async function abrirModalAgendamento(cursoId, cursoNome, cursoDescricao){
    document.getElementById('modalCursoNome').textContent = cursoNome;
    document.getElementById('modalCursoDescricao').textContent = cursoDescricao;
    document.getElementById('msgAgendamento').innerHTML = '';

    const select = document.getElementById('selectHorarios');
    select.innerHTML = '<option value="" disabled selected>Procurando horários...</option>';

    const btnConfirmar = document.getElementById('btnConfirmarAgendamento');
    btnConfirmar.onclick = () => realizarAgendamento(select.value);

    modalAgendamento.show();

    try {
        const response = await fetch(`${API_URL}/disponibilidades/curso/${cursoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const horarios = await response.json();

        select.innerHTML = '<option value="" disabled selected>Escolha um horário...</option>';

        if (!horarios || horarios.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Sem vagas disponíveis de momento.</option>';
            btnConfirmar.disabled = true;
            return;
        }

        btnConfirmar.disabled = false;
        horarios.forEach(h => {
            const dataFormatada = new Date(h.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;
            select.innerHTML += `<option value="${h.id}">${dataFormatada} — ${vagasLivres} vaga(s) disponível(is)</option>`;
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar horários.</option>';
    }
}

async function realizarAgendamento(disponibilidadeId){
    const msgDiv = document.getElementById('msgAgendamento');
    if (!disponibilidadeId) {
        msgDiv.innerHTML = '<span class="text-danger">Por favor, selecione um horário.</span>';
        return;
    }

    msgDiv.innerHTML = '<span class="text-primary"><div class="spinner-border spinner-border-sm me-1"></div> Confirmando presença...</span>';
    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ disponibilidade_id: disponibilidadeId })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i> Agendamento concluído com sucesso!</span>`;
            carregarMeusAgendamentos();
            setTimeout(() => modalAgendamento.hide(), 1400);
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro || 'Erro ao realizar agendamento.'}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de conexão com o servidor.</span>';
    }
}

// ==========================================
// 3. CARREGAR E CANCELAR OS MEUS AGENDAMENTOS
// ==========================================
async function carregarMeusAgendamentos(){
    const divAgendamentos = document.getElementById('listaMeusAgendamentos');
    try {
        const response = await fetch(`${API_URL}/agendamentos/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agendamentos = await response.json();

        divAgendamentos.innerHTML = '';
        if (!agendamentos || agendamentos.length === 0) {
            divAgendamentos.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card">
                        <div class="empty-icon-wrapper">
                            <i class="bi bi-calendar2-x"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-2">Você não possui agendamentos ativos</h4>
                        <p class="text-muted small mb-4" style="max-width: 420px; margin: 0 auto;">
                            Participe como modelo nos cursos práticos do Senac e receba atendimentos especializados gratuitamente.
                        </p>
                        <a href="#vitrine" class="btn btn-brand rounded-pill px-4">
                            <i class="bi bi-search me-1"></i> Explorar Cursos Disponíveis
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        agendamentos.forEach(ag => {
            const cursoNome = ag.disponibilidades?.cursos?.nome || 'Curso Prático';
            const dataHora = new Date(ag.disponibilidades?.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            let badge = '';
            let acoesHTML = '';

            if (ag.status === 'agendado') {
                badge = '<span class="status-badge badge-confirmed"><i class="bi bi-check-circle-fill"></i> Confirmado</span>';
                acoesHTML = `
                    <button class="btn btn-sm btn-outline-danger w-100 rounded-3 mt-3 d-flex align-items-center justify-content-center gap-1" onclick="cancelarAgendamento('${ag.id}')">
                        <i class="bi bi-x-circle"></i> Cancelar Inscrição
                    </button>
                `;
            } else if (ag.status === 'cancelado') {
                badge = '<span class="status-badge badge-cancelled"><i class="bi bi-slash-circle-fill"></i> Cancelado</span>';
            } else if (ag.status === 'concluido') {
                badge = '<span class="status-badge badge-completed"><i class="bi bi-patch-check-fill"></i> Concluído</span>';
                acoesHTML = `
                    <button class="btn btn-sm btn-warning w-100 rounded-3 mt-3 fw-bold d-flex align-items-center justify-content-center gap-1 shadow-sm" onclick="abrirModalFeedback('${ag.id}')">
                        <i class="bi bi-star-fill"></i> Avaliar Atendimento
                    </button>
                `;
            }

            const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card-custom p-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                                <h3 class="h6 fw-bold text-dark mb-0">${cursoNome}</h3>
                                ${badge}
                            </div>
                            <div class="text-muted small d-flex align-items-center gap-2 mb-2">
                                <i class="bi bi-calendar3 text-primary"></i>
                                <span>${dataHora}</span>
                            </div>
                        </div>
                        <div>
                            ${acoesHTML}
                            <div id="msg-canc-${ag.id}" class="small text-center mt-2"></div>
                        </div>
                    </div>
                </div>
            `;
            divAgendamentos.innerHTML += card;
        });
    } catch (error) {
        divAgendamentos.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger rounded-4 text-center p-4">
                    Erro ao carregar histórico de agendamentos.
                </div>
            </div>
        `;
    }
}

async function cancelarAgendamento(agendamentoId){
    if(!confirm("Tem certeza que deseja cancelar sua inscrição neste horário?")) return;

    const msgDiv = document.getElementById(`msg-canc-${agendamentoId}`);
    if (msgDiv) msgDiv.innerHTML = '<span class="text-primary">Cancelando...</span>';

    try {
        const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            carregarMeusAgendamentos();
        } else {
            if (msgDiv) msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro || 'Erro ao cancelar.'}</span>`;
        }
    } catch (error) {
        if (msgDiv) msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
    }
}

// ==========================================
// 4. MÓDULO DE FEEDBACK
// ==========================================
function abrirModalFeedback(agendamentoId){
    document.getElementById('feedbackAgendamentoId').value = agendamentoId;
    document.getElementById('feedbackNota').value = '5';
    document.getElementById('feedbackComentario').value = '';
    document.getElementById('msgFeedback').innerHTML = '';
    modalFeedback.show();
}

const formFeedback = document.getElementById('formFeedback');
if (formFeedback) {
    formFeedback.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgFeedback');
        msgDiv.innerHTML = '<span class="text-primary"><div class="spinner-border spinner-border-sm me-1"></div> Enviando avaliação...</span>';

        const payload = {
            agendamento_id: document.getElementById('feedbackAgendamentoId').value,
            nota: parseInt(document.getElementById('feedbackNota').value),
            comentario: document.getElementById('feedbackComentario').value
        };

        try {
            const response = await fetch(`${API_URL}/feedbacks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<span class="text-success"><i class="bi bi-check2-circle me-1"></i> ${data.mensagem || 'Avaliação registrada com sucesso!'}</span>`;
                carregarMeusFeedbacks();
                setTimeout(() => {
                    modalFeedback.hide();
                }, 1600);
            } else {
                msgDiv.innerHTML = `<span class="text-danger">${data.erro || 'Não foi possível salvar a avaliação.'}</span>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de conexão ao enviar avaliação.</span>';
        }
    });
}

// ==========================================
// 5. HISTÓRICO PESSOAL DE AVALIAÇÕES
// ==========================================
async function carregarMeusFeedbacks(){
    const divFeedbacks = document.getElementById('listaMeusFeedbacks');
    try {
        const response = await fetch(`${API_URL}/feedbacks/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const feedbacks = await response.json();

        divFeedbacks.innerHTML = '';
        if (!feedbacks || feedbacks.length === 0) {
            divFeedbacks.innerHTML = `
                <div class="col-12">
                    <div class="empty-state-card">
                        <div class="empty-icon-wrapper">
                            <i class="bi bi-chat-quote"></i>
                        </div>
                        <h4 class="fw-bold text-dark mb-2">Nenhuma avaliação realizada</h4>
                        <p class="text-muted small mb-0" style="max-width: 420px; margin: 0 auto;">
                            Após participar e concluir suas sessões práticas como modelo, você poderá registrar seus comentários aqui.
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        feedbacks.forEach(f => {
            const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
            const dataFormatada = new Date(f.created_at).toLocaleDateString('pt-BR');
            const comentarioTexto = f.comentario ? `"${f.comentario}"` : '<span class="text-muted fst-italic">Avaliação enviada apenas com nota.</span>';

            const card = `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card-custom p-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h3 class="h6 fw-bold text-dark mb-0 text-truncate" title="${f.curso_nome}">${f.curso_nome}</h3>
                                <span class="badge bg-light text-secondary border small">${dataFormatada}</span>
                            </div>
                            <div class="mb-3 text-warning fs-6">${estrelas}</div>
                            <p class="text-secondary small mb-0">${comentarioTexto}</p>
                        </div>
                    </div>
                </div>
            `;
            divFeedbacks.innerHTML += card;
        });
    } catch (error) {
        divFeedbacks.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger rounded-4 text-center p-4">
                    Erro ao carregar seu histórico de avaliações.
                </div>
            </div>
        `;
    }
}

// Navegação de Retorno para Administrador ou Profissional
document.addEventListener('DOMContentLoaded', () => {
    if(token) {
        try {
            const payloadToken = JSON.parse(atob(token.split('.')[1]));
            const navbar = document.querySelector('.navbar-nav');

            if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
                navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="admin.html"><i class="bi bi-speedometer2 me-1"></i> Painel Admin</a></li>`;
            } else if (payloadToken.perfil === 'profissional') {
                navbar.innerHTML += `<li class="nav-item"><a class="nav-link text-warning fw-bold" href="profissional.html"><i class="bi bi-journal-text me-1"></i> Pauta do Professor</a></li>`;
            }
        } catch (e) {
            console.error("Erro ao decodificar token:", e);
        }
    }
});

// Inicialização
carregarCursos();
carregarMeusAgendamentos();
carregarMeusFeedbacks();