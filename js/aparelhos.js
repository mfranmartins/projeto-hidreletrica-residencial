// USUÁRIO LOGADO
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

// VERIFICAR LOGIN
if (!usuario) {
  window.location.href = "index.html";
}

// IMÓVEL SELECIONADO
const imovelId = Number(localStorage.getItem("imovelSelecionado"));

// BUSCAR IMÓVEIS
const imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];

// BUSCAR IMÓVEL
const imovel = imoveis.find(function (imovel) {
  return imovel.id === imovelId && imovel.usuarioId === usuario.id;
});

// VERIFICAR IMÓVEL
if (!imovel) {
  alert("Imóvel não encontrado.");
  window.location.href = "dashboard.html";
}

// MOSTRAR NOME DO IMÓVEL
document.getElementById("nomeImovel").textContent = imovel.identificacao;

// FORMULÁRIO
const aparelhoForm = document.getElementById("aparelhoForm");

// CADASTRAR APARELHO
aparelhoForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // PEGAR VALORES
  const nome = document.getElementById("nome").value.trim();
  const categoria = document.getElementById("categoria").value;
  const potencia = Number(document.getElementById("potencia").value);
  const quantidade = Number(document.getElementById("quantidade").value);
  const horasUso = Number(document.getElementById("horasUso").value);
  const marca = document.getElementById("marca").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const tensao = document.getElementById("tensao").value;
  const eficiencia = document.getElementById("eficiencia").value;

  // VALIDAÇÕES
  if (
    nome === "" ||
    categoria === "" ||
    marca === "" ||
    modelo === "" ||
    tensao === "" ||
    eficiencia === ""
  ) {
    mostrarMensagem("Preencha todos os campos.");
    return;
  }
  if (potencia <= 0) {
    mostrarMensagem("A potência deve ser maior que zero.");
    return;
  }
  if (quantidade <= 0) {
    mostrarMensagem("A quantidade deve ser maior que zero.");
    return;
  }
  if (horasUso < 0 || horasUso > 24) {
    mostrarMensagem("As horas de uso devem estar entre 0 e 24.");
    return;
  }

  // BUSCAR APARELHOS
  let aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];

  // CALCULAR CONSUMO
  const consumoMensal = (potencia / 1000) * quantidade * horasUso * 30;

  // VERIFICAR SE ESTÁ EDITANDO
  const aparelhoEditando = aparelhoForm.dataset.editando;

  // EDITAR APARELHO
  if (aparelhoEditando) {
    const indice = aparelhos.findIndex(function (aparelho) {
      return aparelho.id === Number(aparelhoEditando);
    });

    if (indice !== -1) {
      aparelhos[indice] = {
        id: aparelhos[indice].id,
        imovelId: imovelId,
        nome: nome,
        categoria: categoria,
        potencia: potencia,
        quantidade: quantidade,
        horasUso: horasUso,
        marca: marca,
        modelo: modelo,
        tensao: tensao,
        eficiencia: eficiencia,
        consumoMensal: consumoMensal,
      };
    }

    // Sair do modo de edição
    delete aparelhoForm.dataset.editando;
    mostrarMensagem("Aparelho atualizado com sucesso!");

    // NOVO APARELHO
  } else {
    const novoAparelho = {
      id: Date.now(),
      imovelId: imovelId,
      nome: nome,
      categoria: categoria,
      potencia: potencia,
      quantidade: quantidade,
      horasUso: horasUso,
      marca: marca,
      modelo: modelo,
      tensao: tensao,
      eficiencia: eficiencia,
      consumoMensal: consumoMensal,
    };
    aparelhos.push(novoAparelho);
    mostrarMensagem("Aparelho cadastrado com sucesso!");
  }

  // ADICIONAR À LISTA
  aparelhos.push(novoAparelho);

  // SALVAR
  localStorage.setItem("aparelhos", JSON.stringify(aparelhos));

  // MENSAGEM
  mostrarMensagem("Aparelho cadastrado com sucesso!");

  // LIMPAR FORMULÁRIO
  aparelhoForm.reset();

  document.getElementById("botaoSalvar").textContent = "Cadastrar aparelho";

  // ATUALIZAR LISTA
  mostrarAparelhos();
});

// MOSTRAR MENSAGEM
function mostrarMensagem(texto) {
  document.getElementById("mensagem").textContent = texto;
}

// MOSTRAR APARELHOS
function mostrarAparelhos() {
  const lista = document.getElementById("listaAparelhos");
  const aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];

  // Filtrar aparelhos do imóvel
  const aparelhosImovel = aparelhos.filter(function (aparelho) {
    return aparelho.imovelId === imovelId;
  });
  lista.innerHTML = "";

  // Nenhum aparelho
  if (aparelhosImovel.length === 0) {
    lista.innerHTML = "<p>Nenhum aparelho cadastrado.</p>";
    document.getElementById("consumoTotal").textContent = "0 kWh/mês";
    return;
  }

  // MOSTRAR CADA APARELHO
  aparelhosImovel.forEach(function (aparelho) {
    const div = document.createElement("div");
    div.innerHTML = `
                <hr>
                <h3>
                    ${aparelho.nome}
                </h3>
                <p>
                    <strong>Categoria:</strong>
                    ${aparelho.categoria}
                </p>
                <p>
                    <strong>Potência:</strong>
                    ${aparelho.potencia} W
                </p>
                <p>
                    <strong>Quantidade:</strong>
                    ${aparelho.quantidade}
                </p>
                <p>
                    <strong>Uso diário:</strong>
                    ${aparelho.horasUso} horas
                </p>
                <p>
                    <strong>Marca:</strong>
                    ${aparelho.marca}
                </p>
                <p>
                    <strong>Modelo:</strong>
                    ${aparelho.modelo}
                </p>
                <p>
                    <strong>Tensão:</strong>
                    ${aparelho.tensao}
                </p>
                <p>
                    <strong>Eficiência:</strong>
                    ${aparelho.eficiencia}
                </p>
                <p>
                    <strong>
                        Consumo estimado:
                    </strong>
                    ${aparelho.consumoMensal.toFixed(2)}
                    kWh/mês
                </p>
                <button
                    onclick="editarAparelho(${aparelho.id})"
                >
                    Editar aparelho
                </button>
                <button
                    onclick="removerAparelho(${aparelho.id})"
                >
                    Remover aparelho
                </button>
            `;
    lista.appendChild(div);
  });

  // CALCULAR TOTAL
  let total = 0;
  aparelhosImovel.forEach(function (aparelho) {
    total += aparelho.consumoMensal;
  });
  document.getElementById("consumoTotal").textContent =
    total.toFixed(2) + " kWh/mês";
}

// REMOVER APARELHO
function removerAparelho(aparelhoId) {
  const confirmar = confirm("Deseja realmente remover este aparelho?");
  if (!confirmar) {
    return;
  }
  let aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];
  aparelhos = aparelhos.filter(function (aparelho) {
    return aparelho.id !== aparelhoId;
  });
  localStorage.setItem("aparelhos", JSON.stringify(aparelhos));
  mostrarAparelhos();
}

// EDITAR APARELHO
function editarAparelho(aparelhoId) {
  let aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];
  const aparelho = aparelhos.find(function (aparelho) {
    return aparelho.id === aparelhoId;
  });
  if (!aparelho) {
    return;
  }
  // Colocar os dados atuais no formulário
  document.getElementById("nome").value = aparelho.nome;
  document.getElementById("categoria").value = aparelho.categoria;
  document.getElementById("potencia").value = aparelho.potencia;
  document.getElementById("quantidade").value = aparelho.quantidade;
  document.getElementById("horasUso").value = aparelho.horasUso;
  document.getElementById("marca").value = aparelho.marca;
  document.getElementById("modelo").value = aparelho.modelo;
  document.getElementById("tensao").value = aparelho.tensao;
  document.getElementById("eficiencia").value = aparelho.eficiencia;
  // Guardar qual aparelho está sendo editado
  aparelhoForm.dataset.editando = aparelhoId;
  document.getElementById("mensagem").textContent =
    "Editando aparelho. Altere os dados e salve novamente.";
  document.getElementById("botaoSalvar").textContent = "Salvar alterações";
}
// CARREGAR APARELHOS
mostrarAparelhos();
