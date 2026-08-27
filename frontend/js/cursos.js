// frontend/js/cursos.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
const isAutenticado = Boolean(token);

// Instâncias dos Modais do Bootstrap
const modalDetalhesCursoEl = document.getElementById('modalDetalhesCurso');
const modalDetalhesCurso = modalDetalhesCursoEl ? new bootstrap.Modal(modalDetalhesCursoEl) : null;

const modalHorariosCursoEl = document.getElementById('modalHorariosCurso');
const modalHorariosCurso = modalHorariosCursoEl ? new bootstrap.Modal(modalHorariosCursoEl) : null;

const modalLoginNecessarioEl = document.getElementById('modalLoginNecessario');
const modalLoginNecessario = modalLoginNecessarioEl ? new bootstrap.Modal(modalLoginNecessarioEl) : null;

let listaTodosCursos = [];

// ==========================================
// 1. CARREGAR CATÁLOGO PÚBLICO DE CURSOS
// ==========================================
async function carregarCatalogoPublico() {
    const divGrid = document.getElementById('listaCursosPublicos');
    try {
        // Tenta endpoint público dedicado, com fallback
        let response = await fetch(`${API_URL}/cursos/publicos`);
        if (!response.ok) {
            response = await fetch(`${API_URL}/cursos/ativos`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
        }

        listaTodosCursos = await response.json();
        renderizarCardsCursos(listaTodosCursos);

    } catch (error) {
        divGrid.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger rounded-4 text-center p-4">
                    <i class="bi bi-exclamation-octagon-fill fs-3 d-block mb-2"></i>
                    <strong>Erro de Conexão:</strong> Não foi possível carregar o catálogo de cursos no momento. Verifique se o servidor está online.
                </div>
            </div>
        `;
    }
}

// ==========================================
// 2. RENDERIZAR CARDS DOS CURSOS
// ==========================================
function renderizarCardsCursos(cursos) {
    const divGrid = document.getElementById('listaCursosPublicos');
    divGrid.innerHTML = '';

    if (!cursos || cursos.length === 0) {
        divGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="p-5 bg-white rounded-4 border shadow-sm" style="max-width: 500px; margin: 0 auto;">
                    <i class="bi bi-mortarboard display-4 text-muted mb-3 d-block"></i>
                    <h4 class="fw-bold text-dark mb-2">Nenhum curso encontrado</h4>
                    <p class="text-muted small mb-0">Não foram encontrados cursos com os termos pesquisados ou não há novas turmas no momento.</p>
                </div>
            </div>
        `;
        return;
    }

    cursos.forEach(curso => {
        const profNome = curso.usuarios ? curso.usuarios.nome : 'Instrutor Especialista Senac';
        const local = curso.localizacao || 'Unidade Senac';
        const imagem = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80';

        const card = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card-curso-publico" onclick='abrirDetalhesCursoPublico(${JSON.stringify(curso).replace(/'/g, "&#39;")})' role="button" tabindex="0">
                    <div class="img-wrapper">
                        <img src="${imagem}" alt="${curso.nome}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'">
                        <span class="card-badge">
                            <i class="bi bi-geo-alt-fill text-warning me-1"></i>${local}
                        </span>
                    </div>
                    <div class="p-4 d-flex flex-column flex-grow-1">
                        <div class="text-muted small fw-semibold mb-1 d-flex align-items-center gap-1">
                            <i class="bi bi-person-fill text-primary"></i> ${profNome}
                        </div>
                        <h3 class="h5 fw-bold text-dark mb-2">${curso.nome}</h3>
                        <p class="small text-secondary flex-grow-1 mb-4" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6;">
                            ${curso.descricao || 'Atendimento prático realizado por alunos sob supervisão pedagógica.'}
                        </p>
                        <div class="pt-3 border-top d-flex align-items-center justify-content-between">
                            <span class="badge-vaga">
                                <i class="bi bi-check-circle-fill me-1"></i>Vagas Abertas
                            </span>
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold" type="button">
                                Ver Detalhes <i class="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        divGrid.innerHTML += card;
    });
}

// ==========================================
// 3. MODAL DE DETALHES COMPLETOS DO CURSO
// ==========================================
function abrirDetalhesCursoPublico(curso) {
    document.getElementById('detalheCursoNome').textContent = curso.nome;
    document.getElementById('detalheCursoProf').textContent = curso.usuarios ? curso.usuarios.nome : 'Docente Especialista Senac';
    document.getElementById('detalheCursoLocal').textContent = curso.localizacao || 'Unidade Senac';
    document.getElementById('detalheCursoDescricao').textContent = curso.descricao || 'Procedimento prático gratuito.';
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
        if (modalDetalhesCurso) modalDetalhesCurso.hide();
        setTimeout(() => {
            abrirHorariosCursoPublico(curso.id, curso.nome);
        }, 350);
    };

    // Carregar avaliações do curso
    const divAvaliacoes = document.getElementById('detalheCursoAvaliacoes');
    divAvaliacoes.innerHTML = '<div class="text-center text-muted small py-3"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Buscando avaliações...</div>';

    fetch(`${API_URL}/feedbacks/publicos/curso/${curso.id}`)
        .then(res => res.json())
        .then(feedbacks => {
            if (!feedbacks || feedbacks.length === 0) {
                divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-3">Este curso ainda não possui avaliações registradas. Participe e seja o primeiro!</div>';
                return;
            }

            const media = (feedbacks.reduce((acc, curr) => acc + curr.nota, 0) / feedbacks.length).toFixed(1);

            let html = `
                <div class="d-flex align-items-center justify-content-between mb-3 p-2 px-3 bg-light rounded-3 border">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fs-5 fw-bold text-dark">${media}</span>
                        <span class="text-warning fs-6">★</span>
                        <span class="small text-muted">/ 5.0</span>
                    </div>
                    <span class="badge bg-primary text-white rounded-pill small">${feedbacks.length} avaliações</span>
                </div>
            `;

            feedbacks.forEach(f => {
                const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
                const dataFormatada = new Date(f.created_at).toLocaleDateString('pt-BR');
                const comentarioTexto = f.comentario ? `"${f.comentario}"` : '<span class="text-muted fst-italic">Avaliação com nota.</span>';

                html += `
                    <div class="bg-light p-3 rounded-3 mb-2 border shadow-sm">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <strong class="small text-dark">${f.avaliador_nome || 'Modelo Voluntário'}</strong>
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
            divAvaliacoes.innerHTML = '<div class="text-muted small text-center py-2">Sem avaliações disponíveis no momento.</div>';
        });

    if (modalDetalhesCurso) modalDetalhesCurso.show();
}

// ==========================================
// 4. CONSULTA DE HORÁRIOS E CANDIDATURA
// ==========================================
async function abrirHorariosCursoPublico(cursoId, cursoNome) {
    document.getElementById('modalCursoNome').textContent = cursoNome;
    const msgDiv = document.getElementById('msgHorarios');
    msgDiv.innerHTML = '';

    const select = document.getElementById('selectHorarios');
    select.innerHTML = '<option value="" disabled selected>Buscando turmas e horários...</option>';

    const btnCandidatar = document.getElementById('btnCandidatarVaga');
    btnCandidatar.onclick = () => {
        const selectedVal = select.value;
        if (!selectedVal) {
            msgDiv.innerHTML = '<span class="text-danger fw-bold">Por favor, selecione um horário disponível.</span>';
            return;
        }

        // Se NÃO estiver logado, redireciona/abre o modal de login/cadastro
        if (!isAutenticado) {
            if (modalHorariosCurso) modalHorariosCurso.hide();
            setTimeout(() => {
                if (modalLoginNecessario) modalLoginNecessario.show();
                else window.location.href = 'index.html';
            }, 350);
            return;
        }

        // Se ESTIVER logado, confirma o agendamento diretamente
        realizarAgendamentoLogado(selectedVal);
    };

    if (modalHorariosCurso) modalHorariosCurso.show();

    try {
        const res = await fetch(`${API_URL}/disponibilidades/publicas/curso/${cursoId}`);
        const horarios = await res.json();

        select.innerHTML = '<option value="" disabled selected>Escolha o melhor dia e horário...</option>';

        if (!horarios || horarios.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Sem horários disponíveis no momento.</option>';
            btnCandidatar.disabled = true;
            return;
        }

        btnCandidatar.disabled = false;
        horarios.forEach(h => {
            const dataFormatada = new Date(h.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const vagasLivres = h.vagas_totais - h.vagas_ocupadas;
            select.innerHTML += `<option value="${h.id}">${dataFormatada} — ${vagasLivres} vaga(s) disponível(is)</option>`;
        });

    } catch (e) {
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar horários.</option>';
    }
}

async function realizarAgendamentoLogado(disponibilidadeId) {
    const msgDiv = document.getElementById('msgHorarios');
    msgDiv.innerHTML = '<span class="text-primary"><div class="spinner-border spinner-border-sm me-1"></div> Confirmando sua vaga...</span>';

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ disponibilidade_id: disponibilidadeId })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i> Vaga garantida com sucesso! Redirecionando para o seu painel...</span>`;
            setTimeout(() => {
                window.location.href = 'painel.html';
            }, 1500);
        } else {
            msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro || 'Erro ao realizar agendamento.'}</span>`;
        }
    } catch (err) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de conexão ao confirmar agendamento.</span>';
    }
}

// ==========================================
// 5. FILTRAGEM / BUSCA EM TEMPO REAL
// ==========================================
const inputBusca = document.getElementById('inputBusca');
if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        if (!termo) {
            renderizarCardsCursos(listaTodosCursos);
            return;
        }

        const filtrados = listaTodosCursos.filter(c => {
            const nome = (c.nome || '').toLowerCase();
            const desc = (c.descricao || '').toLowerCase();
            const local = (c.localizacao || '').toLowerCase();
            const prof = (c.usuarios?.nome || '').toLowerCase();
            return nome.includes(termo) || desc.includes(termo) || local.includes(termo) || prof.includes(termo);
        });

        renderizarCardsCursos(filtrados);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', carregarCatalogoPublico);
