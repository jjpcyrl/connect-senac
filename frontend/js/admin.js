// frontend/js/admin.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

let payloadToken = {};
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Guarda de perfil RBAC: apenas Admin e Coordenador podem acessar o painel administrativo
if (payloadToken.perfil !== 'admin' && payloadToken.perfil !== 'coordenador') {
    alert('Acesso restrito para administradores e coordenadores.');
    window.location.href = payloadToken.perfil === 'profissional' ? 'profissional.html' : 'painel.html';
}

document.getElementById('userNome').textContent = payloadToken.email ? payloadToken.email.split('@')[0] : 'Administrador';
document.getElementById('userPerfil').textContent = payloadToken.perfil ? payloadToken.perfil.toUpperCase() : 'ADMIN';

// Se o utilizador for Coordenador, ocultamos a Tab de criar novos colaboradores (RBAC)
if (payloadToken.perfil === 'coordenador') {
    const equipaTab = document.getElementById('equipa-tab');
    if(equipaTab) equipaTab.style.display = 'none';
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// ============================================================================
// 1. CARREGAR MÉTRICAS DO DASHBOARD
// ============================================================================
async function carregarMetricas(){
    try {
        const response = await fetch(`${API_URL}/dashboard/metricas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('metricUsuarios').textContent = data.totalUsuarios;
            document.getElementById('metricAgendados').textContent = data.agendamentos.agendados;
            document.getElementById('metricConcluidos').textContent = data.agendamentos.concluidos;
            document.getElementById('metricCancelamento').textContent = data.taxaCancelamento;
        }
    } catch (error) {
        console.error("Erro ao carregar dados do dashboard.");
    }
}

// ============================================================================
// 2. GESTÃO DE UTILIZADORES & HISTÓRICO (MODERAÇÃO)
// ============================================================================
// Variável global para guardar os dados da tabela em memória
let baseUtilizadores = [];

// ==========================================
// MÓDULO DE GESTÃO DE UTILIZADORES
// ==========================================
async function carregarUtilizadores(){
    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        baseUtilizadores = await response.json();
        renderizarTabelaUtilizadores(baseUtilizadores); // Renderiza a lista completa
    } catch (error) {
        document.getElementById('tabelaUsuariosBody').innerHTML = '<tr><td colspan="8" class="text-danger text-center">Erro ao ligar ao servidor.</td></tr>';
    }
}

function renderizarTabelaUtilizadores(lista){
    const tbody = document.getElementById('tabelaUsuariosBody');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhum utilizador encontrado com estes filtros.</td></tr>';
        return;
    }

    lista.forEach(user => {
        const statusBadge = user.is_bloqueado
            ? '<span class="badge bg-danger">Bloqueado</span>'
            : '<span class="badge bg-success">Ativo</span>';

        // 1. Mensagem de WhatsApp Dinâmica
        const telLimpo = user.telefone.replace(/\D/g, ''); // Remove formatações
        const msgZap = encodeURIComponent(`Olá, ${user.nome}! Aqui é a Coordenação do Connect Senac.`);
        const btnZap = `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success ms-1" title="Enviar WhatsApp">💬</a>`;

        // 2. Select Dinâmico de Perfis (Apenas Admin vê como <select>, os outros veem como texto)
        let seletorPerfil = `<span class="badge bg-secondary">${user.perfil.toUpperCase()}</span>`;
        if (payloadToken.perfil === 'admin') {
            seletorPerfil = `
                <select class="form-select form-select-sm" style="width: 120px;" onchange="alterarPerfil('${user.id}', this.value)">
                    <option value="candidato" ${user.perfil === 'candidato' ? 'selected' : ''}>Candidato</option>
                    <option value="profissional" ${user.perfil === 'profissional' ? 'selected' : ''}>Professor</option>
                    <option value="coordenador" ${user.perfil === 'coordenador' ? 'selected' : ''}>Coord.</option>
                    <option value="admin" ${user.perfil === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            `;
        }

        const btnBloqueio = payloadToken.perfil === 'admin'
            ? `<button class="btn btn-sm ${user.is_bloqueado ? 'btn-outline-success' : 'btn-outline-danger'} ms-1" onclick="toggleBloqueio('${user.id}', ${user.is_bloqueado})">🔒</button>` : '';

        const podeExcluir = payloadToken.perfil === 'admin' || (payloadToken.perfil === 'coordenador' && user.perfil === 'candidato');
        const btnExcluir = podeExcluir
            ? `<button class="btn btn-sm btn-danger ms-1" onclick="excluirUsuario('${user.id}', '${user.nome}')">🗑️</button>` : '';

        const row = `
            <tr>
                <td><div class="fw-bold">${user.nome}</div></td>
                <td>
                    <div class="small">${user.email}</div>
                    <div class="text-muted small">${user.telefone}</div>
                </td>
                <td>${seletorPerfil}</td>
                <td><span class="text-muted small">${user.cursos_ativos || '-'}</span></td>
                <td class="text-center fw-bold text-primary">${user.total_agendados}</td>
                <td class="text-center fw-bold text-success">${user.total_concluidos}</td>
                <td class="text-center fw-bold text-danger">${user.total_cancelados}</td>
                <td class="text-end text-nowrap">
                    ${btnZap}
                    ${btnBloqueio}
                    ${btnExcluir}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// -----------------------------------------
// LÓGICA DOS FILTROS (Pesquisa em Memória)
// -----------------------------------------
function aplicarFiltrosUsuarios(){
    const termo = document.getElementById('filtroTextoUser').value.toLowerCase();
    const perfil = document.getElementById('filtroPerfilUser').value;

    const listaFiltrada = baseUtilizadores.filter(user => {
        // Verifica se o texto digitado bate com o nome OU com o e-mail
        const matchTexto = user.nome.toLowerCase().includes(termo) || user.email.toLowerCase().includes(termo);
        // Verifica se o perfil escolhido bate (se estiver vazio, aceita todos)
        const matchPerfil = perfil === "" || user.perfil === perfil;

        return matchTexto && matchPerfil;
    });

    renderizarTabelaUtilizadores(listaFiltrada);
}

// Ouve as digitações e cliques para filtrar em tempo real!
const inputBusca = document.getElementById('filtroTextoUser');
const selectPerfil = document.getElementById('filtroPerfilUser');
const btnLimpar = document.getElementById('btnLimparFiltros');

if(inputBusca) inputBusca.addEventListener('input', aplicarFiltrosUsuarios);
if(selectPerfil) selectPerfil.addEventListener('change', aplicarFiltrosUsuarios);
if(btnLimpar) {
    btnLimpar.addEventListener('click', () => {
        inputBusca.value = '';
        selectPerfil.value = '';
        renderizarTabelaUtilizadores(baseUtilizadores);
    });
}

// -----------------------------------------
// FUNÇÃO DE ALTERAÇÃO DE PERFIL VIA API
// -----------------------------------------
async function alterarPerfil(idUsuario, novoPerfil){
    if (!confirm(`Deseja alterar o perfil deste utilizador para ${novoPerfil.toUpperCase()}?`)) {
        carregarUtilizadores(); // Se cancelar, volta o select ao normal
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${idUsuario}/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ perfil: novoPerfil })
        });

        if (response.ok) {
            alert('Perfil atualizado com sucesso!');
            carregarUtilizadores(); // Atualiza a base de dados
        } else {
            const data = await response.json();
            alert(data.erro);
            carregarUtilizadores(); // Reverte
        }
    } catch (error) {
        alert("Erro ao alterar o perfil.");
        carregarUtilizadores(); // Reverte
    }
}

// Lógica de Bloqueio/Desbloqueio (Moderação)
async function toggleBloqueio(id, statusAtual){
    const acao = statusAtual ? 'desbloquear' : 'bloquear';
    if (!confirm(`Tem a certeza que deseja ${acao} este utilizador?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}/bloquear`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_bloqueado: !statusAtual })
        });

        if (response.ok) {
            carregarUtilizadores(); // Recarrega a tabela de utilizadores
            carregarMetricas();     // Atualiza o dashboard
        } else {
            const err = await response.json();
            alert(err.erro);
        }
    } catch (error) {
        alert("Erro de ligação.");
    }
}

// ============================================================================
// 3. CRIAR NOVO COLABORADOR (APENAS ADMIN)
// ============================================================================
const formColaborador = document.getElementById('formColaborador');
if(formColaborador) {
    formColaborador.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgColab');
        msgDiv.innerHTML = '<span class="text-primary">A registar colaborador...</span>';

        const payload = {
            nome: document.getElementById('colabNome').value,
            email: document.getElementById('colabEmail').value,
            telefone: document.getElementById('colabTelefone').value,
            senha: document.getElementById('colabSenha').value,
            perfil: document.getElementById('colabPerfil').value
        };

        try {
            const response = await fetch(`${API_URL}/admin/colaboradores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
                formColaborador.reset();
                carregarUtilizadores(); // Atualiza a lista caso a aba esteja aberta
            } else {
                msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de ligação com o servidor.</span>';
        }
    });
}

// ============================================================================
// LÓGICA DE CADASTRO DE CURSO & VAGAS
// ============================================================================
const formCurso = document.getElementById('formCurso');
formCurso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('msgCurso');
    msgDiv.innerHTML = '<span class="text-primary">A guardar curso...</span>';

    const payload = {
        nome: document.getElementById('nomeCurso').value,
        descricao: document.getElementById('descricaoCurso').value,
        motivo_modelo: document.getElementById('motivoCurso').value,
        restricoes: document.getElementById('restricoesCurso').value,
        foto_url: document.getElementById('fotoCurso').value,
        localizacao: document.getElementById('localCurso').value,
        profissional_id: document.getElementById('selectProfissional').value
       
    };

    try {
        const response = await fetch(`${API_URL}/cursos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            formCurso.reset();
            carregarCursosNoSelect();
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de ligação.</span>';
    }
});

async function carregarCursosNoSelect(){
    const select = document.getElementById('selectCurso');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        select.innerHTML = '<option value="" disabled selected>Selecione o curso...</option>';
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso.id;
            option.textContent = curso.nome;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar cursos</option>';
    }
}

const formVagas = document.getElementById('formVagas');
formVagas.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('msgVaga');
    msgDiv.innerHTML = '<span class="text-primary">A abrir vagas...</span>';

    const payload = {
        curso_id: document.getElementById('selectCurso').value,
        data_hora: document.getElementById('dataHora').value,
        vagas_totais: parseInt(document.getElementById('vagasTotais').value)
    };

    try {
        const response = await fetch(`${API_URL}/disponibilidades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
            formVagas.reset();
            carregarMetricas();
        } else {
            msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = '<span class="text-danger">Erro de ligação.</span>';
    }
});

async function carregarProfissionaisNoSelect(){
    const select = document.getElementById('selectProfissional');
    try {
        const response = await fetch(`${API_URL}/admin/profissionais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profissionais = await response.json();
        select.innerHTML = '<option value="" disabled selected>Selecione o professor...</option>';
        profissionais.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nome;
            select.appendChild(option);
        });
    } catch (error) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar professores</option>';
    }
}

async function excluirUsuario(id, nome){
    if (!confirm(`ATENÇÃO: Tem certeza absoluta que deseja remover a conta de ${nome}? Todos os seus agendamentos serão excluídos.`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarUtilizadores(); // Atualiza a tabela
            carregarMetricas();     // Atualiza o dashboard
        } else {
            const err = await response.json();
            alert(err.erro);
        }
    } catch (error) {
        alert("Erro na conexão com o servidor.");
    }
}
// Instância do Modal de Edição (Adicione no topo junto às outras variáveis)
let modalEditarCursoInstance = null;

// Esperar o DOM carregar para instanciar o Modal
document.addEventListener("DOMContentLoaded", () => {
    const modalEl = document.getElementById('modalEditarCurso');
    if (modalEl) modalEditarCursoInstance = new bootstrap.Modal(modalEl);

    // Iniciar carregamentos
    carregarCursosAdmin();
});

// ==========================================
// 1. ATUALIZAR A CRIAÇÃO DE CURSOS
// ==========================================
// Procure o seu 'formCurso.addEventListener' e atualize o payload para incluir os novos campos:
/*
    const payload = {
        // ... (mantenha os campos existentes)
        foto_url: document.getElementById('fotoCurso').value,
        localizacao: document.getElementById('localCurso').value,
        profissional_id: document.getElementById('selectProfissional').value
    };
*/

// ==========================================
// 2. LISTAR CURSOS NA TABELA DE GESTÃO
// ==========================================
async function carregarCursosAdmin(){
    const tbody = document.getElementById('tabelaCursosBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/cursos/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        tbody.innerHTML = '';
        if (cursos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum curso cadastrado.</td></tr>';
            return;
        }

        cursos.forEach(curso => {
            const profNome = curso.usuarios ? curso.usuarios.nome : 'Sem Professor';
            const statusBadge = curso.status === 'ativo'
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-secondary">Arquivado</span>';

            // O arquivamento é um Soft Delete. Só mostramos o botão se estiver ativo.
            const btnArquivar = curso.status === 'ativo'
                ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="arquivarCurso('${curso.id}', '${curso.nome}')">Arquivar</button>`
                : '';

            const row = `
                <tr>
                    <td>
                        <div class="fw-bold text-dark">${curso.nome}</div>
                        <div class="small text-muted text-truncate" style="max-width: 200px;">${curso.descricao}</div>
                    </td>
                    <td>${profNome}</td>
                    <td class="small">${curso.localizacao || '-'}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick='abrirModalEdicao(${JSON.stringify(curso).replace(/'/g, "&#39;")})'>Editar</button>
                        ${btnArquivar}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erro ao carregar catálogo.</td></tr>';
    }
}

// ==========================================
// 3. EDITAR E ARQUIVAR CURSOS
// ==========================================
async function arquivarCurso(id, nome){
    if(!confirm(`Deseja arquivar o curso "${nome}"? Ele sairá da vitrine dos alunos, mas o histórico será mantido.`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarCursosAdmin(); // Atualiza a tabela
            carregarCursosNoSelect(); // Atualiza os selects de formulários
        } else {
            alert('Erro ao arquivar curso.');
        }
    } catch (error) {
        alert('Erro de conexão.');
    }
}

function abrirModalEdicao(curso){
    document.getElementById('editCursoId').value = curso.id;
    document.getElementById('editNome').value = curso.nome;
    document.getElementById('editDescricao').value = curso.descricao;
    document.getElementById('editMotivo').value = curso.motivo_modelo || '';
    document.getElementById('editRestricoes').value = curso.restricoes || '';
    document.getElementById('editLocal').value = curso.localizacao || '';
    document.getElementById('editFoto').value = curso.foto_url || '';

    // Copiar opções do select de profissionais principal para o select do modal
    const selectPrincipal = document.getElementById('selectProfissional');
    const selectEdit = document.getElementById('editProfissional');
    selectEdit.innerHTML = selectPrincipal.innerHTML;
    selectEdit.value = curso.profissional_id;

    document.getElementById('msgEditCurso').innerHTML = '';
    modalEditarCursoInstance.show();
}

const formEditarCurso = document.getElementById('formEditarCurso');
if (formEditarCurso) {
    formEditarCurso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCursoId').value;
        const msgDiv = document.getElementById('msgEditCurso');
        msgDiv.innerHTML = '<span class="text-primary">A atualizar...</span>';

        const payload = {
            nome: document.getElementById('editNome').value,
            descricao: document.getElementById('editDescricao').value,
            motivo_modelo: document.getElementById('editMotivo').value,
            restricoes: document.getElementById('editRestricoes').value,
            localizacao: document.getElementById('editLocal').value,
            foto_url: document.getElementById('editFoto').value,
            profissional_id: document.getElementById('editProfissional').value
        };

        try {
            const response = await fetch(`${API_URL}/cursos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                msgDiv.innerHTML = '<span class="text-success">Atualizado com sucesso!</span>';
                carregarCursosAdmin();
                carregarCursosNoSelect();
                setTimeout(() => modalEditarCursoInstance.hide(), 1500);
            } else {
                const err = await response.json();
                msgDiv.innerHTML = `<span class="text-danger">${err.erro || 'Erro ao atualizar.'}</span>`;
            }
        } catch (error) {
            msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
        }
    });
}

// ============================================================================
// 4. PAUTAS GLOBAIS POR TURMA E GESTÃO DE AGENDAMENTOS
// ============================================================================
async function carregarPautasGlobais() {
    const accordion = document.getElementById('accordionPautasGlobais');
    if (!accordion) return;

    try {
        const response = await fetch(`${API_URL}/admin/pautas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        accordion.innerHTML = '';
        if (!Array.isArray(cursos) || cursos.length === 0) {
            accordion.innerHTML = '<div class="alert alert-info border-0 shadow-sm">Nenhum curso ativo ou agendamento registrado de momento.</div>';
            return;
        }

        cursos.forEach((curso, index) => {
            const profNome = curso.usuarios?.nome || 'Não atribuído';
            let horariosHTML = '';

            const disponibilidades = curso.disponibilidades || [];
            disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

            if (disponibilidades.length === 0) {
                horariosHTML = '<p class="text-muted small">Sem horários abertos para este curso.</p>';
            } else {
                disponibilidades.forEach(disp => {
                    const dataFormatada = new Date(disp.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const agendamentos = disp.agendamentos || [];

                    let tabelaModelos = '';
                    if (agendamentos.length === 0) {
                        tabelaModelos = '<p class="text-muted small mb-0 mt-2">Nenhum modelo inscrito neste horário.</p>';
                    } else {
                        let linhas = agendamentos.map(ag => {
                            const alunoNome = ag.usuarios?.nome || 'Voluntário';
                            const alunoTel = ag.usuarios?.telefone || '';
                            const telLimpo = alunoTel.replace(/\D/g, '');
                            const msgZap = encodeURIComponent(`Olá, ${alunoNome}! Aqui é a Coordenação do Senac referente ao curso ${curso.nome}.`);

                            const btnZap = telLimpo
                                ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="btn btn-sm btn-outline-success border-0" title="WhatsApp">📱</a>`
                                : '';

                            let statusBadge = '';
                            if (ag.status === 'agendado') statusBadge = '<span class="badge bg-primary">Agendado</span>';
                            else if (ag.status === 'concluido') statusBadge = '<span class="badge bg-success">Concluído</span>';
                            else statusBadge = '<span class="badge bg-danger">Cancelado</span>';

                            const btnCancelarAdmin = ag.status === 'agendado'
                                ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="adminCancelarAgendamento('${ag.id}', '${alunoNome.replace(/'/g, "\\'")}')" title="Cancelar Forçadamente (Admin)">❌</button>`
                                : '';

                            return `
                                <tr>
                                    <td class="align-middle fw-bold">${alunoNome}</td>
                                    <td class="align-middle">${alunoTel || '-'} ${btnZap}</td>
                                    <td class="align-middle">${statusBadge}</td>
                                    <td class="align-middle text-end">${btnCancelarAdmin}</td>
                                </tr>
                            `;
                        }).join('');

                        tabelaModelos = `
                            <table class="table table-sm mt-3 border">
                                <thead class="table-light">
                                    <tr><th>Modelo</th><th>Contato</th><th>Status</th><th class="text-end">Ação Admin</th></tr>
                                </thead>
                                <tbody>${linhas}</tbody>
                            </table>
                        `;
                    }

                    horariosHTML += `
                        <div class="mb-4 p-3 bg-white border rounded">
                            <div class="fw-bold text-dark border-bottom pb-2">
                                📅 Horário: ${dataFormatada}
                                <span class="badge bg-secondary float-end">Ocupação: ${disp.vagas_ocupadas} / ${disp.vagas_totais}</span>
                            </div>
                            ${tabelaModelos}
                        </div>
                    `;
                });
            }

            const itemOpen = index === 0 ? 'show' : '';
            const btnCollapsed = index === 0 ? '' : 'collapsed';

            accordion.innerHTML += `
                <div class="accordion-item border-0 border-bottom">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${btnCollapsed}" type="button" data-bs-toggle="collapse" data-bs-target="#pautaCurso${curso.id}">
                            📘 ${curso.nome} <span class="badge bg-light text-dark ms-2">Prof. ${profNome}</span>
                        </button>
                    </h2>
                    <div id="pautaCurso${curso.id}" class="accordion-collapse collapse ${itemOpen}" data-bs-parent="#accordionPautasGlobais">
                        <div class="accordion-body bg-light">
                            ${horariosHTML}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        accordion.innerHTML = '<div class="text-danger p-4">Erro ao carregar as pautas globais.</div>';
    }
}

async function adminCancelarAgendamento(agendamentoId, nomeAluno) {
    if (!confirm(`[ADMIN] Deseja cancelar forçadamente o agendamento de "${nomeAluno}"? A vaga será libertada imediatamente.`)) return;

    try {
        const response = await fetch(`${API_URL}/agendamentos/admin/${agendamentoId}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarPautasGlobais();
            carregarMetricas();
            carregarUtilizadores();
        } else {
            const err = await response.json();
            alert(err.erro || 'Erro ao cancelar agendamento.');
        }
    } catch (error) {
        alert('Erro ao conectar ao servidor.');
    }
}

// Ouvinte para recarregar pautas quando a aba for clicada
const pautasTabBtn = document.getElementById('pautas-tab');
if (pautasTabBtn) {
    pautasTabBtn.addEventListener('click', carregarPautasGlobais);
}

// Chame essa função na inicialização do arquivo (no final do admin.js)
carregarProfissionaisNoSelect();
// Inicialização de ecrã
carregarMetricas();
carregarCursosNoSelect();
carregarUtilizadores();
carregarPautasGlobais();