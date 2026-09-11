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

// Somente imóveis do usuário logado
const meusImoveis = imoveis.filter(function (imovel) {
  return imovel.usuarioId === usuario.id;
});

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

  let resumo = calcularResumo(consumosImovel);
  const div = document.createElement("div");
  div.innerHTML = `
        <hr>
        <h3>${imovel.identificacao}</h3>
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
                ${resumo.media.toFixed(2)} kWh/mês
            </strong>
        </p>
        <p>
            Maior consumo:
            <strong>
                ${resumo.maximo.toFixed(2)} kWh/mês
            </strong>
        </p>
        <p>
            Menor consumo:
            <strong>
                ${resumo.minimo.toFixed(2)} kWh/mês
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

        <button onclick="abrirConsumo(${imovel.id})">
            Histórico de consumo
        </button>
        <button onclick="abrirConsumo(${imovel.id})">
            Cadastrar consumo
        </button>
        <button onclick="mostrarGrafico(${imovel.id})">
            Ver gráfico
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

// CADASTRAR IMÓVEL
function cadastrarImovel() {
  window.location.href = "imovel.html";
}
function mostrarGrafico(imovelId) {
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
