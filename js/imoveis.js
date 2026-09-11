const imovelForm = document.getElementById("imovelForm");
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

// Se não estiver logado, volta para o login
if (!usuarioLogado) {
  window.location.href = "index.html";
}

imovelForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const identificacao = document.getElementById("identificacao").value;
  const endereco = document.getElementById("endereco").value;
  const tipo = document.getElementById("tipo").value;
  let imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];
  const novoImovel = {
    id: Date.now(),
    usuarioId: usuarioLogado.id,
    identificacao: identificacao,
    endereco: endereco,
    tipo: tipo,
  };

  imoveis.push(novoImovel);
  localStorage.setItem("imoveis", JSON.stringify(imoveis));
  document.getElementById("mensagem").textContent =
    "Imóvel cadastrado com sucesso!";

  imovelForm.reset();
});
