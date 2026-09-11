const cadastroForm = document.getElementById("cadastroForm");
const loginForm = document.getElementById("loginForm");

// CADASTRO

if (cadastroForm) {
  cadastroForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuarioExistente = usuarios.find(function (usuario) {
      return usuario.email === email;
    });

    if (usuarioExistente) {
      document.getElementById("mensagem").textContent =
        "Este e-mail já está cadastrado.";

      return;
    }

    const novoUsuario = {
      id: Date.now(),
      nome: nome,
      email: email,
      senha: senha,
    };

    usuarios.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    document.getElementById("mensagem").textContent =
      "Cadastro realizado com sucesso!";

    cadastroForm.reset();
  });
}

// LOGIN

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(function (usuario) {
      return usuario.email === email && usuario.senha === senha;
    });

    if (!usuario) {
      document.getElementById("mensagem").textContent =
        "E-mail ou senha incorretos.";

      return;
    }

    // Salva o usuário atualmente logado
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));

    // Vai para o dashboard
    window.location.href = "dashboard.html";
  });
}
