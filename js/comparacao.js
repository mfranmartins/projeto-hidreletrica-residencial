// USUÁRIO LOGADO
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

// VERIFICAR LOGIN
if (!usuario) {
  window.location.href = "index.html";
}

// BUSCAR IMÓVEIS
const imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];

// FILTRAR IMÓVEIS DO USUÁRIO
const meusImoveis = imoveis.filter(function (imovel) {
  return imovel.usuarioId === usuario.id;
});

// BUSCAR CONSUMOS
const consumos = JSON.parse(localStorage.getItem("consumos")) || [];

// BUSCAR APARELHOS
const aparelhos = JSON.parse(localStorage.getItem("aparelhos")) || [];

// CONTAINER
const container = document.getElementById("comparacaoImoveis");

// NENHUM IMÓVEL
if (meusImoveis.length === 0) {
  container.innerHTML = "<p>Nenhum imóvel cadastrado.</p>";
}

// CRIAR RESUMO DO IMÓVEL
function gerarResumo(imovel) {
  // CONSUMOS DO IMÓVEL
  const consumosImovel = consumos.filter(function (consumo) {
    return consumo.imovelId === imovel.id;
  });

  // APARELHOS DO IMÓVEL
  const aparelhosImovel = aparelhos.filter(function (aparelho) {
    return aparelho.imovelId === imovel.id;
  });

  // CONSUMO REAL
  let consumoMedio = 0;
  let consumoMaximo = 0;
  let mesMaiorConsumo = "";

  if (consumosImovel.length > 0) {
    let total = 0;
    consumosImovel.forEach(function (consumo) {
      total += consumo.consumo;

      if (consumo.consumo > consumoMaximo) {
        consumoMaximo = consumo.consumo;
        mesMaiorConsumo = consumo.mes + "/" + consumo.ano;
      }
    });
    consumoMedio = total / consumosImovel.length;
  }

  // CONSUMO ESTIMADO DOS APARELHOS
  let consumoEstimado = 0;
  aparelhosImovel.forEach(function (aparelho) {
    consumoEstimado += aparelho.consumoMensal;
  });

  return {
    consumoMedio: consumoMedio,
    consumoMaximo: consumoMaximo,
    mesMaiorConsumo: mesMaiorConsumo,
    quantidadeMeses: consumosImovel.length,
    consumoEstimado: consumoEstimado,
    quantidadeAparelhos: aparelhosImovel.length,
  };
}

// MOSTRAR COMPARAÇÃO
meusImoveis.forEach(function (imovel) {
  const resumo = gerarResumo(imovel);
  const div = document.createElement("div");
  div.innerHTML = `
      <hr>
      <h2>
        ${imovel.identificacao}
      </h2>
      ${
        resumo.quantidadeMeses === 0
          ? `
        <p>
          ⚠️ Sem registros de consumo
          para realizar a comparação.
        </p>
        `
          : `
        <p>
          <strong>
            Consumo médio:
          </strong>
          ${resumo.consumoMedio.toFixed(2)}
          kWh/mês
        </p>
        <p>
          <strong>
            Maior consumo:
          </strong>
          ${resumo.consumoMaximo.toFixed(2)}
          kWh/mês
        </p>
        <p>
          <strong>
            Mês de maior consumo:
          </strong>
          ${resumo.mesMaiorConsumo}
        </p>
        <p>
          <strong>
            Meses analisados:
          </strong>
          ${resumo.quantidadeMeses}
        </p>
        `
      }
      <p>
        <strong>
          Consumo estimado pelos aparelhos:
        </strong>
        ${resumo.consumoEstimado.toFixed(2)}
        kWh/mês
      </p>
      <p>
        <strong>
          Aparelhos cadastrados:
        </strong>
        ${resumo.quantidadeAparelhos}
      </p>
    `;
  container.appendChild(div);
});
