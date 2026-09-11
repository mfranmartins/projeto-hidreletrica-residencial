const consumoForm = document.getElementById("consumoForm");
const imovelSelecionadoId = Number(localStorage.getItem("imovelSelecionado"));
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

// VERIFICAR LOGIN
if (!usuarioLogado) {
  window.location.href = "index.html";
}

// BUSCAR IMÓVEL
const imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];
const imovel = imoveis.find(function (imovel) {
  return (
    imovel.id === imovelSelecionadoId && imovel.usuarioId === usuarioLogado.id
  );
});

if (!imovel) {
  alert("Imóvel não encontrado.");
  window.location.href = "dashboard.html";
}

// Mostrar nome do imóvel
document.getElementById("nomeImovel").textContent = imovel.identificacao;

// CADASTRAR CONSUMO
consumoForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const mes = Number(document.getElementById("mes").value);
  const ano = Number(document.getElementById("ano").value);
  const consumo = Number(document.getElementById("consumo").value);

  // Validação
  if (consumo < 0 || isNaN(consumo)) {
    document.getElementById("mensagem").textContent =
      "Informe um consumo válido.";
    return;
  }
  let consumos = JSON.parse(localStorage.getItem("consumos")) || [];

  // Verificar se o mês já existe
  const registroExistente = consumos.find(function (registro) {
    return (
      registro.imovelId === imovel.id &&
      registro.mes === mes &&
      registro.ano === ano
    );
  });

  if (registroExistente) {
    document.getElementById("mensagem").textContent =
      "Já existe um registro para este mês e ano.";
    return;
  }

  // Criar novo registro
  const novoConsumo = {
    id: Date.now(),
    imovelId: imovel.id,
    mes: mes,
    ano: ano,
    consumo: consumo,
  };

  consumos.push(novoConsumo);
  localStorage.setItem("consumos", JSON.stringify(consumos));

  document.getElementById("mensagem").textContent =
    "Consumo cadastrado com sucesso!";

  consumoForm.reset();
  mostrarHistorico();
});

// MOSTRAR HISTÓRICO
function mostrarHistorico() {
  const historico = document.getElementById("historico");
  const consumos = JSON.parse(localStorage.getItem("consumos")) || [];
  const consumosImovel = consumos.filter(function (registro) {
    return registro.imovelId === imovel.id;
  });

  // Ordenar por ano e mês
  consumosImovel.sort(function (a, b) {
    if (a.ano !== b.ano) {
      return a.ano - b.ano;
    }
    return a.mes - b.mes;
  });

  if (consumosImovel.length === 0) {
    historico.innerHTML = "<p>Nenhum consumo cadastrado.</p>";
    return;
  }

  historico.innerHTML = "";
  consumosImovel.forEach(function (registro) {
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

    const div = document.createElement("div");
    div.innerHTML = `
            <hr>

            <h3>
                ${nomesMeses[registro.mes]}
                de ${registro.ano}
            </h3>

            <p>
                Consumo:
                <strong>
                    ${registro.consumo} kWh/mês
                </strong>
            </p>
        `;
    historico.appendChild(div);
  });
}

// Mostrar histórico ao abrir a página
mostrarHistorico();
