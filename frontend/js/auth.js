// frontend/js/auth.js

const FALLBACK_BASE_URL = "http://localhost:3000/api/usuarios";
const API_URL =
  window.location.protocol === "file:"
    ? FALLBACK_BASE_URL
    : `${window.location.origin}/api/usuarios`;

// Toggle de Visibilidade de Senha
const btnToggleSenha = document.getElementById("btnToggleSenha");
if (btnToggleSenha) {
  btnToggleSenha.addEventListener("click", () => {
    const inputSenha = document.getElementById("senha");
    const iconToggle = document.getElementById("iconToggleSenha");
    if (!inputSenha || !iconToggle) return;

    if (inputSenha.type === "password") {
      inputSenha.type = "text";
      iconToggle.classList.remove("bi-eye");
      iconToggle.classList.add("bi-eye-slash");
    } else {
      inputSenha.type = "password";
      iconToggle.classList.remove("bi-eye-slash");
      iconToggle.classList.add("bi-eye");
    }
  });
}

// Máscara de Telefone / Celular (BR)
const inputTelefone = document.getElementById("telefone");
if (inputTelefone) {
  inputTelefone.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      // Formato com 9 dígitos: (11) 99999-9999
      e.target.value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (value.length > 6) {
      // Formato parcial: (11) 9999-9999
      e.target.value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (value.length > 2) {
      e.target.value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    } else {
      e.target.value = value;
    }
  });
}

// Lógica de Login
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const msgErro = document.getElementById("mensagemErro");
    const btnEntrar = document.getElementById("btnEntrar");

    const originalBtnText = btnEntrar ? btnEntrar.innerHTML : "";
    if (btnEntrar) {
      btnEntrar.disabled = true;
      btnEntrar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>Autenticando...</span>
      `;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        if (msgErro) msgErro.classList.add("d-none");
        localStorage.setItem("token", data.token);

        // Redirecionamento RBAC
        const perfil = data.utilizador ? data.utilizador.perfil : data.usuario?.perfil;

        if (perfil === "admin" || perfil === "coordenador") {
          window.location.href = "admin.html";
        } else if (perfil === "profissional") {
          window.location.href = "profissional.html";
        } else {
          window.location.href = "painel.html";
        }
      } else {
        if (msgErro) {
          msgErro.textContent = data.erro || "Credenciais inválidas. Verifique seu e-mail e senha.";
          msgErro.classList.remove("d-none");
        }
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      if (msgErro) {
        msgErro.textContent = "Erro de conexão com o servidor. Tente novamente.";
        msgErro.classList.remove("d-none");
      }
    } finally {
      if (btnEntrar) {
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = originalBtnText;
      }
    }
  });
}

// Lógica de Cadastro
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmar_senha = document.getElementById("confirmar_senha").value;

    const consentimento_termos = document.getElementById("termoUso").checked ? 1 : 0;
    const consentimento_imagem = document.getElementById("termoImagem").checked ? 1 : 0;

    const msgDiv = document.getElementById("mensagemCadastro");
    const btnCadastrar = document.getElementById("btnCadastrar");

    if (senha !== confirmar_senha) {
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 px-3 rounded-3">As senhas não coincidem. Verifique a digitação.</div>`;
      return;
    }

    const originalBtnText = btnCadastrar ? btnCadastrar.innerHTML : "";
    if (btnCadastrar) {
      btnCadastrar.disabled = true;
      btnCadastrar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>Criando conta...</span>
      `;
    }

    try {
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
        msgDiv.innerHTML = `
          <div class="alert alert-success py-2 px-3 rounded-3">
            <i class="bi bi-check-circle-fill me-1"></i> Conta criada com sucesso! Redirecionando para o login...
          </div>
        `;
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1800);
      } else {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 px-3 rounded-3">${data.erro || "Erro ao cadastrar."}</div>`;
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      msgDiv.innerHTML = `<div class="alert alert-danger py-2 px-3 rounded-3">Erro de conexão com o servidor.</div>`;
    } finally {
      if (btnCadastrar) {
        btnCadastrar.disabled = false;
        btnCadastrar.innerHTML = originalBtnText;
      }
    }
  });
}

// Lógica de Solicitar Recuperação de Senha
const formEsqueci = document.getElementById("formEsqueci");
if (formEsqueci) {
  formEsqueci.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById("msgRecuperacao");
    const email = document.getElementById("emailRecuperacao").value.trim();
    const btnEnviar = document.getElementById("btnEnviarRecuperacao");

    const originalBtnText = btnEnviar ? btnEnviar.innerHTML : "";
    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>Enviando...</span>
      `;
    }

    try {
      const response = await fetch(`${API_URL}/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      msgDiv.innerHTML = `<div class="alert alert-success py-2 px-3 rounded-3">${data.mensagem || "Instruções enviadas com sucesso!"}</div>`;
    } catch (error) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 px-3 rounded-3">Erro de conexão com o servidor.</div>';
    } finally {
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = originalBtnText;
      }
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
    const btnSalvar = document.getElementById("btnSalvarNovaSenha");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 px-3 rounded-3">Link de recuperação inválido (Token ausente).</div>';
      return;
    }

    if (nova_senha !== confirmar_senha) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 px-3 rounded-3">As senhas não coincidem.</div>';
      return;
    }

    const originalBtnText = btnSalvar ? btnSalvar.innerHTML : "";
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>Atualizando...</span>
      `;
    }

    try {
      const response = await fetch(`${API_URL}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha, confirmar_senha }),
      });

      const data = await response.json();

      if (response.ok) {
        msgDiv.innerHTML = `<div class="alert alert-success py-2 px-3 rounded-3">${data.mensagem || "Senha atualizada com sucesso!"} Redirecionando...</div>`;
        setTimeout(() => (window.location.href = "index.html"), 2500);
      } else {
        msgDiv.innerHTML = `<div class="alert alert-danger py-2 px-3 rounded-3">${data.erro || "Falha ao redefinir senha."}</div>`;
      }
    } catch (error) {
      msgDiv.innerHTML = '<div class="alert alert-danger py-2 px-3 rounded-3">Erro de conexão com o servidor.</div>';
    } finally {
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = originalBtnText;
      }
    }
  });
}