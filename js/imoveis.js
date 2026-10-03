const imovelForm = document.getElementById("imovelForm");
const mensagem = document.getElementById("mensagem");
const areaDemo = document.getElementById("areaDemo");
const carregarDemoBtn = document.getElementById("carregarDemoBtn");
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

// Se não estiver logado, volta para o login.
if (!usuarioLogado) {
  window.location.href = "index.html";
} else {
  atualizarAreaDemo();
}

// Retorna os imóveis salvos.
function obterImoveis() {
  return JSON.parse(localStorage.getItem("imoveis")) || [];
}

// Verifica se o usuário já possui algum imóvel.
function atualizarAreaDemo() {
  const imoveis = obterImoveis();
  const imoveisDoUsuario = imoveis.filter(
    (imovel) => String(imovel.usuarioId) === String(usuarioLogado.id),
  );
  if (areaDemo) {
    areaDemo.hidden = imoveisDoUsuario.length > 0;
  }
}

// Cadastro manual de imóvel.
imovelForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const identificacao = document.getElementById("identificacao").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const tipo = document.getElementById("tipo").value;
  if (!identificacao || !endereco || !tipo) {
    mensagem.textContent = "Preencha todos os campos.";
    return;
  }
  const imoveis = obterImoveis();
  const novoImovel = {
    id: Date.now(),
    usuarioId: usuarioLogado.id,
    identificacao,
    endereco,
    tipo,
  };
  imoveis.push(novoImovel);
  localStorage.setItem("imoveis", JSON.stringify(imoveis));
  // Seleciona o imóvel cadastrado.
  localStorage.setItem("imovelSelecionado", JSON.stringify(novoImovel));
  mensagem.textContent = "Imóvel cadastrado com sucesso!";
  imovelForm.reset();
  atualizarAreaDemo();
});

// Carrega os dados de demonstração.
carregarDemoBtn.addEventListener("click", function () {
  if (typeof dadosDemo === "undefined") {
    mensagem.textContent =
      "Não foi possível carregar os dados de demonstração. Verifique o arquivo dadosDemo.js.";
    return;
  }

  const imoveis = obterImoveis();

  // Impede a criação duplicada da demonstração.
  const demoExistente = imoveis.find(
    (imovel) =>
      imovel.demonstracao === true &&
      String(imovel.usuarioId) === String(usuarioLogado.id),
  );

  if (demoExistente) {
    localStorage.setItem("imovelSelecionado", JSON.stringify(demoExistente));

    mensagem.textContent =
      "Os dados de demonstração já existem. Imóvel selecionado.";

    atualizarAreaDemo();
    return;
  }

  // Cria identificadores vinculados ao usuário atual.
  const sufixo = String(usuarioLogado.id);
  const idImovel = `demo-imovel-${sufixo}`;

  const novoImovel = {
    ...dadosDemo.imovel,
    id: idImovel,
    usuarioId: usuarioLogado.id,
    identificacao: "Residência Demo",
    endereco: "São Paulo - SP",
    tipo: "Casa",
    demonstracao: true,
  };

  const novosConsumos = dadosDemo.consumos.map((consumo) => ({
    ...consumo,
    id: `${consumo.id}-${sufixo}`,
    imovelId: idImovel,
    usuarioId: usuarioLogado.id,
    demonstracao: true,
  }));

  const novosAparelhos = dadosDemo.aparelhos.map((aparelho) => ({
    ...aparelho,
    id: `${aparelho.id}-${sufixo}`,
    imovelId: idImovel,
    usuarioId: usuarioLogado.id,
    demonstracao: true,
  }));

  // Preserva os dados que já existem.
  const consumos = JSON.parse(localStorage.getItem("consumos")) || [];

  const aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];

  imoveis.push(novoImovel);

  localStorage.setItem("imoveis", JSON.stringify(imoveis));

  localStorage.setItem(
    "consumos",
    JSON.stringify([...consumos, ...novosConsumos]),
  );

  localStorage.setItem(
    "aparelhos",
    JSON.stringify([...aparelhos, ...novosAparelhos]),
  );

  // Seleciona a Residência Demo automaticamente.
  localStorage.setItem("imovelSelecionado", JSON.stringify(novoImovel));
  mensagem.textContent = "Dados de demonstração carregados com sucesso!";
  atualizarAreaDemo();
});
