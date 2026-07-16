// frontend/js/auth.js

const FALLBACK_BASE_URL = "http://localhost:3000/api/usuarios";
const API_URL =
  window.location.protocol === "file:"
    ? FALLBACK_BASE_URL
    : `${window.location.origin}/api/usuarios`;

// Lógica de Login
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que a página recarregue ao submeter o formulário

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const msgErro = document.getElementById("mensagemErro");

    try {
      // Fazendo a requisição POST para o Back-end
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        // Redirecionamento Inteligente baseado no Perfil (RBAC)
        const perfil = data.utilizador.perfil;

        if (perfil === "admin" || perfil === "coordenador") {
          window.location.href = "admin.html";
        } else if (perfil === "profissional") {
          window.location.href = "profissional.html";
        } else {
          window.location.href = "painel.html"; // Candidato/Modelo
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
    }
  });
}

// Lógica de Registo
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefone = document.getElementById("telefone").value;
    const senha = document.getElementById("senha").value;
    const confirmar_senha = document.getElementById("confirmar_senha").value; // Captura o novo campo

    const consentimento_termos = document.getElementById("termoUso").checked
      ? 1
      : 0;
    const consentimento_imagem = document.getElementById("termoImagem").checked
      ? 1
      : 0;

    const msgDiv = document.getElementById("mensagemCadastro");

    // [NOVIDADE V2] Validação no Front-end (Client-Side Validation)
    if (senha !== confirmar_senha) {
      msgDiv.innerHTML = `<span class="text-danger fw-bold">Erro: As palavras-passe não coincidem. Verifique a digitação.</span>`;
      return; // O comando 'return' para a execução aqui, impedindo o 'fetch' abaixo.
    }

    try {
      // Se as senhas forem iguais, enviamos o payload completo para o Back-end
      const response = await fetch(`${API_URL}/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          senha,
          confirmar_senha,
          consentimento_termos,
          consentimento_imagem,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        msgDiv.innerHTML = `<span class="text-success fw-bold">Conta criada com sucesso! A redirecionar para o login...</span>`;
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
      } else {
        msgDiv.innerHTML = `<span class="text-danger fw-bold">${data.erro}</span>`;
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      msgDiv.innerHTML = `<span class="text-danger fw-bold">Erro de conexão com o servidor.</span>`;
    }
  });
}

// Lógica de Solicitar Recuperação
const formEsqueci = document.getElementById("formEsqueci");
if (formEsqueci) {
  formEsqueci.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgRecuperacao");
    const email = document.getElementById("emailRecuperacao").value;

    msgDiv.innerHTML = '<span class="text-primary">A processar...</span>';

    try {
      const response = await fetch(`${API_URL}/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      msgDiv.innerHTML = `<span class="text-success">${data.mensagem}</span>`;
      // DICA PARA TESTE LOCAL: O link será impresso no terminal do VS Code onde roda o Node!
    } catch (error) {
      msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
    }
  });
}

// Lógica de Redefinir Senha
const formRedefinir = document.getElementById("formRedefinir");
if (formRedefinir) {
  formRedefinir.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgRedefinir");
    const nova_senha = document.getElementById("novaSenha").value;
    const confirmar_senha = document.getElementById("confirmarNovaSenha").value;

    // Capturar o token da URL (ex: ?token=abc123xyz)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      msgDiv.innerHTML =
        '<span class="text-danger">Link de recuperação inválido (Token ausente).</span>';
      return;
    }

    if (nova_senha !== confirmar_senha) {
      msgDiv.innerHTML =
        '<span class="text-danger">As palavras-passe não coincidem.</span>';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha, confirmar_senha }),
      });

      const data = await response.json();

      if (response.ok) {
        msgDiv.innerHTML = `<span class="text-success">${data.mensagem} A redirecionar...</span>`;
        setTimeout(() => (window.location.href = "index.html"), 3000);
      } else {
        msgDiv.innerHTML = `<span class="text-danger">${data.erro}</span>`;
      }
    } catch (error) {
      msgDiv.innerHTML = '<span class="text-danger">Erro de conexão.</span>';
    }
  });
}