// frontend/js/auth.js

// URL base da nossa API
const API_URL = 'http://localhost:3000/api/usuarios';

// Lógica de Login
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que a página recarregue ao submeter o formulário

        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const msgErro = document.getElementById('mensagemErro');

        try {
            // Fazendo a requisição POST para o Back-end
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                // Guarda o Token JWT no navegador para as próximas requisições
                localStorage.setItem('token', data.token);
                // Redireciona para o painel do utilizador
                window.location.href = 'painel.html';
            } else {
                msgErro.textContent = data.erro;
                msgErro.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    });
}

// Lógica de Registo
// frontend/js/auth.js

const FALLBACK_BASE_URL = 'http://localhost:3000/api/usuarios';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api/usuarios`;

// ... [Mantenha a Lógica de Login intacta] ...

// Lógica de Registo (Atualizada para V2)
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const telefone = document.getElementById('telefone').value;
        const senha = document.getElementById('senha').value;
        const confirmar_senha = document.getElementById('confirmar_senha').value; // Captura o novo campo

        const consentimento_termos = document.getElementById('termoUso').checked ? 1 : 0;
        const consentimento_imagem = document.getElementById('termoImagem').checked ? 1 : 0;

        const msgDiv = document.getElementById('mensagemCadastro');

        // [NOVIDADE V2] Validação no Front-end (Client-Side Validation)
        if (senha !== confirmar_senha) {
            msgDiv.innerHTML = `<span class="text-danger fw-bold">Erro: As palavras-passe não coincidem. Verifique a digitação.</span>`;
            return; // O comando 'return' para a execução aqui, impedindo o 'fetch' abaixo.
        }

        try {
            // Se as senhas forem iguais, enviamos o payload completo para o Back-end
            const response = await fetch(`${API_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem
                })
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.innerHTML = `<span class="text-success fw-bold">Conta criada com sucesso! A redirecionar para o login...</span>`;
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro}</span>`;
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            msgDiv.innerHTML = `<span class="text-danger fw-bold">Erro de conexão com o servidor.</span>`;
        }
    });
}