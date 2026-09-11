// USUÁRIO LOGADO
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

// VERIFICAR LOGIN
if (!usuario) {
  window.location.href = "index.html";
}

// BOAS-VINDAS
document.getElementById("boasVindas").textContent =
  "Olá, " + usuario.nome + "!";

// BUSCAR IMÓVEIS
const imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];
const listaImoveis = document.getElementById("listaImoveis");

// PEGAR SOMENTE OS IMÓVEIS
// DO USUÁRIO LOGADO
const meusImoveis = imoveis.filter(function (imovel) {
  return imovel.usuarioId === usuario.id;
});

// EXIBIR IMÓVEIS
if (meusImoveis.length === 0) {
  listaImoveis.innerHTML = "<p>Nenhum imóvel cadastrado.</p>";
} else {
  meusImoveis.forEach(function (imovel) {
    criarCardImovel(imovel);
  });
}

// CRIAR CARD DO IMÓVEL
function criarCardImovel(imovel) {
  const consumos = JSON.parse(localStorage.getItem("consumos")) || [];
  const consumosImovel = consumos.filter(function (registro) {
    return registro.imovelId === imovel.id;
  });
  const resumo = calcularResumo(consumosImovel);
  const div = document.createElement("div");

  div.innerHTML = `
        <hr>
        <h3>
            ${imovel.identificacao}
        </h3>
        <p>
            <strong>Localidade:</strong>
            ${imovel.endereco}
        </p>
        <p>
            <strong>Tipo:</strong>
            ${imovel.tipo}
        </p>
        <h4>Resumo energético</h4>
        <p>
            Consumo médio:
            <strong>
                ${resumo.media.toFixed(2)}
                kWh/mês
            </strong>
        </p>
        <p>
            Maior consumo:
            <strong>
                ${resumo.maximo.toFixed(2)}
                kWh/mês
            </strong>
        </p>
        <p>
            Menor consumo:
            <strong>
                ${resumo.minimo.toFixed(2)}
                kWh/mês
            </strong>
        </p>
        <p>
            Mês de maior consumo:
            <strong>
                ${resumo.mesMaior}
            </strong>
        </p>
        <p>
            Meses analisados:
            <strong>
                ${resumo.quantidade}
            </strong>
        </p>
        <br>
        <button onclick="abrirConsumo(${imovel.id})">
            Gerenciar consumo
        </button>
        <button onclick="abrirAparelhos(${imovel.id})">
            Aparelhos
        </button>
        <button onclick="mostrarGrafico(${imovel.id})">
            Ver gráfico
        </button>
        <button onclick="removerImovel(${imovel.id})">
            Remover imóvel
        </button>
    `;
  listaImoveis.appendChild(div);
}

// CALCULAR RESUMO
function calcularResumo(consumos) {
  if (consumos.length === 0) {
    return {
      media: 0,
      maximo: 0,
      minimo: 0,
      mesMaior: "Nenhum registro",
      quantidade: 0,
    };
  }
  let total = 0;
  let maximo = consumos[0];
  let minimo = consumos[0];

  consumos.forEach(function (registro) {
    total += registro.consumo;
    if (registro.consumo > maximo.consumo) {
      maximo = registro;
    }
    if (registro.consumo < minimo.consumo) {
      minimo = registro;
    }
  });
  const media = total / consumos.length;
  const nomesMeses = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return {
    media: media,
    maximo: maximo.consumo,
    minimo: minimo.consumo,
    mesMaior: nomesMeses[maximo.mes] + "/" + maximo.ano,
    quantidade: consumos.length,
  };
}

// ABRIR CONSUMO
function abrirConsumo(id) {
  localStorage.setItem("imovelSelecionado", id);
  window.location.href = "consumo.html";
}

// ABRIR APARELHOS
function abrirAparelhos(id) {
  localStorage.setItem("imovelSelecionado", id);
  window.location.href = "aparelhos.html";
}

// MOSTRAR GRÁFICO
function mostrarGrafico(imovelId) {
  // Guardar o imóvel atualmente selecionado
  localStorage.setItem("imovelSelecionado", imovelId);
  const consumos = JSON.parse(localStorage.getItem("consumos")) || [];
  const consumosImovel = consumos.filter(function (registro) {
    return registro.imovelId === imovelId;
  });
  consumosImovel.sort(function (a, b) {
    if (a.ano !== b.ano) {
      return a.ano - b.ano;
    }
    return a.mes - b.mes;
  });

  const nomesMeses = [
    "",
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const labels = consumosImovel.map(function (registro) {
    return nomesMeses[registro.mes] + "/" + registro.ano;
  });
  const valores = consumosImovel.map(function (registro) {
    return registro.consumo;
  });
  const imovel = meusImoveis.find(function (imovel) {
    return imovel.id === imovelId;
  });
  if (imovel) {
    document.getElementById("nomeGrafico").textContent =
      "Consumo de " + imovel.identificacao;
  }
  const canvas = document.getElementById("graficoConsumo");

  if (window.meuGrafico) {
    window.meuGrafico.destroy();
  }
  window.meuGrafico = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Consumo (kWh/mês)",
          data: valores,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// REMOVER IMÓVEL
function removerImovel(imovelId) {
  const imovel = meusImoveis.find(function (imovel) {
    return imovel.id === imovelId;
  });

  if (!imovel) {
    return;
  }

  const confirmar = confirm(
    "Tem certeza que deseja remover o imóvel " +
      imovel.identificacao +
      "?\n\n" +
      "Os registros de consumo desse imóvel também serão removidos.",
  );
  if (!confirmar) {
    return;
  }

  // REMOVER IMÓVEL
  let imoveisAtualizados = JSON.parse(localStorage.getItem("imoveis")) || [];
  imoveisAtualizados = imoveisAtualizados.filter(function (imovel) {
    return imovel.id !== imovelId;
  });
  localStorage.setItem("imoveis", JSON.stringify(imoveisAtualizados));

  // REMOVER CONSUMOS DO IMÓVEL
  let consumos = JSON.parse(localStorage.getItem("consumos")) || [];
  consumos = consumos.filter(function (registro) {
    return registro.imovelId !== imovelId;
  });
  localStorage.setItem("consumos", JSON.stringify(consumos));

  // REMOVER APARELHOS DO IMÓVEL
  let aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];
  aparelhos = aparelhos.filter(function (aparelho) {
    return aparelho.imovelId !== imovelId;
  });
  localStorage.setItem("aparelhos", JSON.stringify(aparelhos));

  // LIMPAR IMÓVEL SELECIONADO
  const selecionado = Number(localStorage.getItem("imovelSelecionado"));
  if (selecionado === imovelId) {
    localStorage.removeItem("imovelSelecionado");
  }

  // RECARREGAR DASHBOARD
  window.location.reload();
}

// CADASTRAR IMÓVEL
function cadastrarImovel() {
  window.location.href = "imovel.html";
}

// LOGOUT
function logout() {
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("imovelSelecionado");
  window.location.href = "index.html";
}

// CARREGAR GRÁFICO AUTOMATICAMENTE
const imovelSelecionado = Number(localStorage.getItem("imovelSelecionado"));

if (imovelSelecionado) {
  const existe = meusImoveis.some(function (imovel) {
    return imovel.id === imovelSelecionado;
  });
  if (existe) {
    mostrarGrafico(imovelSelecionado);
  }
}
