// USUÁRIO LOGADO
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

// VERIFICAR LOGIN
if (!usuario) {
  window.location.href = "index.html";
}

// IMÓVEL SELECIONADO
const imovelSelecionadoId = localStorage.getItem("imovelSelecionado");

// BUSCAR IMÓVEIS
const imoveis = JSON.parse(localStorage.getItem("imoveis")) || [];

// BUSCAR IMÓVEL
const imovel = imoveis.find(function (imovel) {
  return (
    String(imovel.id) === String(imovelSelecionadoId) &&
    String(imovel.usuarioId) === String(usuario.id)
  );
});

// VERIFICAR IMÓVEL
if (!imovel) {
  alert("Imóvel não encontrado.");
  window.location.href = "dashboard.html";
}

// MOSTRAR NOME DO IMÓVEL
document.getElementById("nomeImovel").textContent = imovel.identificacao;

// BUSCAR CONSUMOS
const consumos = JSON.parse(localStorage.getItem("consumos")) || [];

// FILTRAR CONSUMOS DO IMÓVEL
const consumosImovel = consumos.filter(function (registro) {
  return String(registro.imovelId) === String(imovel.id);
});

// ELEMENTOS DA PÁGINA
const mesesAnalisados = document.getElementById("mesesAnalisados");

const consumoMedioMensal = document.getElementById("consumoMedioMensal");

const consumoMedioDiario = document.getElementById("consumoMedioDiario");

const mensagem = document.getElementById("mensagem");

// VARIÁVEL QUE SERÁ USADA NO T21
let mediaDiaria = 0;

// VERIFICAR SE EXISTEM CONSUMOS
if (consumosImovel.length === 0) {
  mensagem.textContent =
    "Não existem registros de consumo suficientes para realizar o dimensionamento.";

  mesesAnalisados.textContent = "0";
  consumoMedioMensal.textContent = "0";
  consumoMedioDiario.textContent = "0";
} else {
  // CALCULAR CONSUMO TOTAL
  let consumoTotal = 0;

  consumosImovel.forEach(function (registro) {
    consumoTotal += Number(registro.consumo);
  });

  // CONSUMO MÉDIO MENSAL
  const mediaMensal = consumoTotal / consumosImovel.length;

  // CONSUMO MÉDIO DIÁRIO
  mediaDiaria = mediaMensal / 30;

  // EXIBIR RESULTADOS
  mesesAnalisados.textContent = consumosImovel.length;

  consumoMedioMensal.textContent = mediaMensal.toFixed(2);

  consumoMedioDiario.textContent = mediaDiaria.toFixed(2);

  mensagem.textContent = "Consumo de referência calculado com sucesso.";
}

// ==========================================
// T21 - POTÊNCIA FOTOVOLTAICA
// ==========================================

// FORMULÁRIO
const dimensionamentoForm = document.getElementById("dimensionamentoForm");

const potenciaFV = document.getElementById("potenciaFV");

const mensagemPotencia = document.getElementById("mensagemPotencia");

// CALCULAR POTÊNCIA FOTOVOLTAICA
dimensionamentoForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // HSP
  const hsp = Number(document.getElementById("hsp").value);

  // PERFORMANCE RATIO
  const performanceRatio = Number(
    document.getElementById("performanceRatio").value,
  );

  // VALIDAÇÃO DA HSP
  if (hsp <= 0 || isNaN(hsp)) {
    mensagemPotencia.textContent = "Informe uma HSP válida.";

    return;
  }

  // VALIDAÇÃO DO PR
  if (
    performanceRatio <= 0 ||
    performanceRatio > 1 ||
    isNaN(performanceRatio)
  ) {
    mensagemPotencia.textContent = "Informe um Performance Ratio entre 0 e 1.";

    return;
  }

  // VERIFICAR CONSUMO
  if (mediaDiaria <= 0) {
    mensagemPotencia.textContent =
      "Não foi possível calcular a potência porque não existe consumo válido.";

    return;
  }

  // FÓRMULA
  const potencia = mediaDiaria / (hsp * performanceRatio);

  // EXIBIR RESULTADO
  potenciaFV.textContent = potencia.toFixed(2);

  mensagemPotencia.textContent = "Potência fotovoltaica estimada com sucesso.";
});
// ==========================================
// T22 - MÓDULOS FOTOVOLTAICOS
// ==========================================

const listaModulos = document.getElementById("listaModulos");

const mensagemModulos = document.getElementById("mensagemModulos");

// CARREGAR CSV
fetch("datasets/modulos.csv")
  .then(function (resposta) {
    return resposta.text();
  })
  .then(function (texto) {
    const linhas = texto.trim().split("\n");

    // IGNORAR CABEÇALHO
    const modulos = linhas.slice(1).map(function (linha) {
      const valores = linha.split(";");

      return {
        id: valores[0],
        fabricante: valores[1],
        modelo: valores[2],
        potenciaWp: Number(valores[3]),
        voc: Number(valores[4]),
        isc: Number(valores[5]),
        vmp: Number(valores[6]),
        imp: Number(valores[7]),
        eficiencia: Number(valores[8]),
        preco: Number(valores[9]),
      };
    });

    // CALCULAR POTÊNCIA FV NECESSÁRIA
    const hsp = Number(document.getElementById("hsp").value);

    const performanceRatio = Number(
      document.getElementById("performanceRatio").value,
    );

    const potenciaFVCalculada = mediaDiaria / (hsp * performanceRatio);

    const potenciaNecessariaWp = potenciaFVCalculada * 1000;

    // GERAR RESULTADOS
    let html = "";

    modulos.forEach(function (modulo) {
      const quantidade = Math.ceil(potenciaNecessariaWp / modulo.potenciaWp);

      const potenciaInstalada = quantidade * modulo.potenciaWp;

      html += `
        <div class="card">

          <h3>
            ${modulo.fabricante} - ${modulo.modelo}
          </h3>

          <p>
            <strong>Potência:</strong>
            ${modulo.potenciaWp} W
          </p>

          <p>
            <strong>Eficiência:</strong>
            ${modulo.eficiencia}%
          </p>

          <p>
            <strong>Quantidade necessária:</strong>
            ${quantidade} módulos
          </p>

          <p>
            <strong>Potência instalada:</strong>
            ${(potenciaInstalada / 1000).toFixed(2)} kWp
          </p>

          <p>
            <strong>Preço unitário:</strong>
            R$ ${modulo.preco.toFixed(2)}
          </p>

          <button
            type="button"
            onclick="selecionarModulo('${modulo.id}')"
          >
            Selecionar módulo
          </button>

        </div>
      `;
    });

    listaModulos.innerHTML = html;

    mensagemModulos.textContent = `${modulos.length} modelos de módulos analisados.`;

    // GUARDAR MÓDULOS PARA A SELEÇÃO
    window.modulosDisponiveis = modulos;
  })
  .catch(function (erro) {
    console.error("Erro ao carregar módulos:", erro);

    mensagemModulos.textContent =
      "Não foi possível carregar o arquivo de módulos.";
  });

// SELECIONAR MÓDULO
function selecionarModulo(id) {
  const modulo = window.modulosDisponiveis.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!modulo) {
    return;
  }

  // RECALCULAR QUANTIDADE
  const hsp = Number(document.getElementById("hsp").value);

  const performanceRatio = Number(
    document.getElementById("performanceRatio").value,
  );

  const potenciaFVCalculada = mediaDiaria / (hsp * performanceRatio);

  const potenciaNecessariaWp = potenciaFVCalculada * 1000;

  const quantidade = Math.ceil(potenciaNecessariaWp / modulo.potenciaWp);

  const potenciaInstalada = quantidade * modulo.potenciaWp;

  // SALVAR CONFIGURAÇÃO
  window.moduloSelecionado = modulo;
  window.quantidadeModulos = quantidade;

  // MOSTRAR SELEÇÃO
  mensagemModulos.innerHTML = `
    <strong>Módulo selecionado:</strong>
    ${modulo.fabricante} ${modulo.modelo}<br>

    <strong>Quantidade:</strong>
    ${quantidade} módulos<br>

    <strong>Potência instalada:</strong>
    ${(potenciaInstalada / 1000).toFixed(2)} kWp
  `;

  // ATUALIZAR INVERSORES
  if (typeof atualizarInversores === "function") {
    atualizarInversores();
  }
}
// ==========================================
// T23 - INVERSORES
// ==========================================

const listaInversores = document.getElementById("listaInversores");

const mensagemInversores = document.getElementById("mensagemInversores");

// CARREGAR CSV
fetch("datasets/inversores.csv")
  .then(function (resposta) {
    return resposta.text();
  })
  .then(function (texto) {
    const linhas = texto.trim().split("\n");

    // IGNORAR CABEÇALHO
    const inversores = linhas.slice(1).map(function (linha) {
      const valores = linha.split(";");

      return {
        id: valores[0],
        fabricante: valores[1],
        modelo: valores[2],
        tipo: valores[3],
        potenciaNominal: Number(valores[4]),
        potenciaMaxFV: Number(valores[5]),
        tensaoMaxEntrada: Number(valores[6]),
        mpptMin: Number(valores[7]),
        mpptMax: Number(valores[8]),
        correnteMaxEntrada: Number(valores[9]),
        numeroMPPT: Number(valores[10]),
        compativelBateria: valores[11] === "true",
        preco: Number(valores[12]),
      };
    });

    // GUARDAR INVERSORES
    window.inversoresDisponiveis = inversores;

    // MOSTRAR MENSAGEM INICIAL
    listaInversores.innerHTML =
      "<p>Selecione um módulo para verificar os inversores compatíveis.</p>";
  })
  .catch(function (erro) {
    console.error("Erro ao carregar inversores:", erro);

    mensagemInversores.textContent =
      "Não foi possível carregar o arquivo de inversores.";
  });

// ATUALIZAR INVERSORES
function atualizarInversores() {
  const modulo = window.moduloSelecionado;
  const quantidade = window.quantidadeModulos;
  const inversores = window.inversoresDisponiveis;

  if (!modulo || !quantidade || !inversores) {
    return;
  }

  // ==========================================
  // CONFIGURAÇÃO DO ARRANJO
  // ==========================================

  // Para esta etapa do projeto, consideramos
  // todos os módulos em uma única string.
  const numeroStrings = 1;

  const modulosPorString = quantidade;

  // ==========================================
  // CÁLCULOS ELÉTRICOS
  // ==========================================

  const potenciaArray = quantidade * modulo.potenciaWp;

  const vocString = modulosPorString * modulo.voc;

  const vmpString = modulosPorString * modulo.vmp;

  const correnteString = modulo.isc;

  // ==========================================
  // ANALISAR INVERSORES
  // ==========================================

  let html = "";

  let quantidadeCompativeis = 0;

  inversores.forEach(function (inversor) {
    const potenciaOk = potenciaArray <= inversor.potenciaMaxFV;

    const vocOk = vocString <= inversor.tensaoMaxEntrada;

    const vmpOk =
      vmpString >= inversor.mpptMin && vmpString <= inversor.mpptMax;

    const correnteOk = correnteString <= inversor.correnteMaxEntrada;

    const compativel = potenciaOk && vocOk && vmpOk && correnteOk;

    if (compativel) {
      quantidadeCompativeis++;
    }

    // ==========================================
    // MOTIVOS DA COMPATIBILIDADE
    // ==========================================

    let motivos = "";

    if (!potenciaOk) {
      motivos += `
        <p>
          ❌ Potência FV:
          ${potenciaArray} W >
          ${inversor.potenciaMaxFV} W
        </p>
      `;
    }

    if (!vocOk) {
      motivos += `
        <p>
          ❌ Voc:
          ${vocString.toFixed(2)} V >
          ${inversor.tensaoMaxEntrada} V
        </p>
      `;
    }

    if (!vmpOk) {
      let explicacaoVmp = "";

      if (vmpString < inversor.mpptMin) {
        explicacaoVmp = `${vmpString.toFixed(2)} V < ${inversor.mpptMin} V`;
      } else {
        explicacaoVmp = `${vmpString.toFixed(2)} V > ${inversor.mpptMax} V`;
      }

      motivos += `
        <p>
          ❌ Vmp:
          ${explicacaoVmp}
        </p>
      `;
    }

    if (!correnteOk) {
      motivos += `
        <p>
          ❌ Corrente:
          ${correnteString.toFixed(2)} A >
          ${inversor.correnteMaxEntrada} A
        </p>
      `;
    }

    // ==========================================
    // CARD DO INVERSOR
    // ==========================================

    html += `
      <div class="card">

        <h3>
          ${inversor.fabricante} - ${inversor.modelo}
        </h3>

        <p>
          <strong>Status:</strong>
          ${compativel ? "Compatível ✓" : "Não compatível ✗"}
        </p>

        <p>
          <strong>Tipo:</strong>
          ${inversor.tipo}
        </p>

        <p>
          <strong>Potência nominal:</strong>
          ${inversor.potenciaNominal} W
        </p>

        <p>
          <strong>Potência máxima FV:</strong>
          ${inversor.potenciaMaxFV} W
        </p>

        <hr>

        <p>
          <strong>Configuração:</strong>
          ${numeroStrings} string com
          ${modulosPorString} módulos em série
        </p>

        <p>
          <strong>Potência FV:</strong>
          ${potenciaArray} W
          ${potenciaOk ? "✓" : "✗"}
        </p>

        <p>
          <strong>Voc da string:</strong>
          ${vocString.toFixed(2)} V
          ${vocOk ? "✓" : "✗"}
        </p>

        <p>
          <strong>Vmp da string:</strong>
          ${vmpString.toFixed(2)} V
          ${vmpOk ? "✓" : "✗"}
        </p>

        <p>
          <strong>Corrente da string:</strong>
          ${correnteString.toFixed(2)} A
          ${correnteOk ? "✓" : "✗"}
        </p>

        <p>
          <strong>Faixa MPPT:</strong>
          ${inversor.mpptMin} V –
          ${inversor.mpptMax} V
        </p>

        <p>
          <strong>Tensão máxima:</strong>
          ${inversor.tensaoMaxEntrada} V
        </p>

        <p>
          <strong>Corrente máxima:</strong>
          ${inversor.correnteMaxEntrada} A
        </p>

        ${
          !compativel
            ? `
              <hr>
              <p><strong>Motivo:</strong></p>
              ${motivos}
            `
            : ""
        }

        <p>
          <strong>MPPTs:</strong>
          ${inversor.numeroMPPT}
        </p>

        <p>
          <strong>Compatível com bateria:</strong>
          ${inversor.compativelBateria ? "Sim" : "Não"}
        </p>

        <p>
          <strong>Preço:</strong>
          R$ ${inversor.preco.toFixed(2)}
        </p>

      </div>
    `;
  });

  // ==========================================
  // RESULTADO FINAL
  // ==========================================

  listaInversores.innerHTML = html;

  mensagemInversores.textContent = `${quantidadeCompativeis} inversores compatíveis com a configuração selecionada.`;
}
// ==========================================
// T24 - BATERIAS
// ==========================================

const bateriaForm =
  document.getElementById("bateriaForm");

const listaBaterias =
  document.getElementById("listaBaterias");

const mensagemBaterias =
  document.getElementById("mensagemBaterias");

const resumoBateria =
  document.getElementById("resumoBateria");


let bateriasDisponiveis = [];


// ==========================================
// CARREGAR CSV
// ==========================================

fetch("datasets/baterias.csv")
  .then(function (resposta) {
    return resposta.text();
  })
  .then(function (texto) {

    const linhas =
      texto.trim().split("\n");


    // IGNORAR CABEÇALHO
    bateriasDisponiveis =
      linhas.slice(1).map(function (linha) {

        const valores =
          linha.split(";");


        return {

          id: valores[0],

          fabricante:
            valores[1],

          modelo:
            valores[2],

          tecnologia:
            valores[3],

          tensaoNominal:
            Number(valores[4]),

          capacidadeAh:
            valores[5]
              ? Number(valores[5])
              : null,

          capacidadeKwh:
            Number(valores[6]),

          dod:
            Number(valores[7]),

          ciclos:
            Number(valores[8]),

          preco:
            Number(valores[9]),

          fornecedor:
            valores[10],

          dataColeta:
            valores[11],

          urlFonte:
            valores[12],

          condicoesCiclos:
            valores[13],

          correnteMaxCarga:
            Number(valores[14]),

          correnteMaxDescarga:
            Number(valores[15]),

          tensaoOperacionalMin:
            Number(valores[16]),

          tensaoOperacionalMax:
            Number(valores[17]),

          comunicacao:
            valores[18]

        };

      });


    window.bateriasDisponiveis =
      bateriasDisponiveis;


    renderizarBaterias();

  })
  .catch(function (erro) {

    console.error(
      "Erro ao carregar baterias:",
      erro
    );

    mensagemBaterias.textContent =
      "Não foi possível carregar o arquivo de baterias.";

  });


// ==========================================
// FORMULÁRIO
// ==========================================

bateriaForm.addEventListener(
  "submit",
  function (evento) {

    evento.preventDefault();

    renderizarBaterias();

  }
);


// ==========================================
// RENDERIZAR BATERIAS
// ==========================================

function renderizarBaterias() {

  if (!bateriasDisponiveis.length) {
    return;
  }


  const autonomia =
    Number(
      document.getElementById("autonomia").value
    );


  if (autonomia <= 0) {

    mensagemBaterias.textContent =
      "Informe uma autonomia maior que zero.";

    return;

  }


  // ==========================================
  // CONSUMO NECESSÁRIO
  // ==========================================

  const energiaNecessaria =
    mediaDiaria *
    autonomia;


  resumoBateria.innerHTML = `
    <h3>Resumo do dimensionamento</h3>

    <p>
      <strong>Consumo médio diário:</strong>
      ${mediaDiaria.toFixed(2)} kWh/dia
    </p>

    <p>
      <strong>Autonomia desejada:</strong>
      ${autonomia} dia(s)
    </p>

    <p>
      <strong>Energia necessária:</strong>
      ${energiaNecessaria.toFixed(2)} kWh
    </p>
  `;


  // ==========================================
  // GERAR CARDS
  // ==========================================

  let html = "";


  bateriasDisponiveis.forEach(
    function (bateria) {


      // CAPACIDADE ÚTIL
      const capacidadeUtil =
        bateria.capacidadeKwh *
        (bateria.dod / 100);


      // QUANTIDADE NECESSÁRIA
      const quantidade =
        Math.ceil(
          energiaNecessaria /
          capacidadeUtil
        );


      // CAPACIDADE INSTALADA
      const capacidadeInstalada =
        quantidade *
        bateria.capacidadeKwh;


      // CAPACIDADE ÚTIL INSTALADA
      const capacidadeUtilInstalada =
        quantidade *
        capacidadeUtil;


      // CUSTO TOTAL
      const custoTotal =
        quantidade *
        bateria.preco;


      html += `
        <div class="card">

          <h3>
            ${bateria.fabricante} -
            ${bateria.modelo}
          </h3>

          <p>
            <strong>Tecnologia:</strong>
            ${bateria.tecnologia}
          </p>

          <p>
            <strong>Tensão nominal:</strong>
            ${bateria.tensaoNominal} V
          </p>

          <p>
            <strong>Capacidade:</strong>
            ${bateria.capacidadeKwh.toFixed(2)} kWh
          </p>

          ${
            bateria.capacidadeAh
              ? `
                <p>
                  <strong>Capacidade:</strong>
                  ${bateria.capacidadeAh} Ah
                </p>
              `
              : ""
          }

          <p>
            <strong>DoD:</strong>
            ${bateria.dod}%
          </p>

          <p>
            <strong>Capacidade útil por bateria:</strong>
            ${capacidadeUtil.toFixed(2)} kWh
          </p>

          <p>
            <strong>Quantidade necessária:</strong>
            ${quantidade} bateria(s)
          </p>

          <p>
            <strong>Capacidade instalada:</strong>
            ${capacidadeInstalada.toFixed(2)} kWh
          </p>

          <p>
            <strong>Capacidade útil instalada:</strong>
            ${capacidadeUtilInstalada.toFixed(2)} kWh
          </p>

          <p>
            <strong>Ciclos:</strong>
            ${bateria.ciclos}
          </p>

          <p>
            <strong>Corrente máxima de carga:</strong>
            ${bateria.correnteMaxCarga} A
          </p>

          <p>
            <strong>Corrente máxima de descarga:</strong>
            ${bateria.correnteMaxDescarga} A
          </p>

          <p>
            <strong>Faixa operacional:</strong>
            ${bateria.tensaoOperacionalMin} V –
            ${bateria.tensaoOperacionalMax} V
          </p>

          <p>
            <strong>Comunicação:</strong>
            ${bateria.comunicacao}
          </p>

          <p>
            <strong>Preço unitário:</strong>
            R$ ${bateria.preco.toFixed(2)}
          </p>

          <p>
            <strong>Custo total:</strong>
            R$ ${custoTotal.toFixed(2)}
          </p>

          <button
            type="button"
            onclick="selecionarBateria('${bateria.id}')"
          >
            Selecionar bateria
          </button>

        </div>
      `;

    }
  );


  listaBaterias.innerHTML =
    html;


  mensagemBaterias.textContent =
    `${bateriasDisponiveis.length} modelos de baterias analisados.`;

}


// ==========================================
// SELECIONAR BATERIA
// ==========================================

function selecionarBateria(id) {

  const bateria =
    bateriasDisponiveis.find(
      function (item) {

        return String(item.id) ===
          String(id);

      }
    );


  if (!bateria) {
    return;
  }


  const autonomia =
    Number(
      document.getElementById("autonomia").value
    );


  const energiaNecessaria =
    mediaDiaria *
    autonomia;


  const capacidadeUtil =
    bateria.capacidadeKwh *
    (bateria.dod / 100);


  const quantidade =
    Math.ceil(
      energiaNecessaria /
      capacidadeUtil
    );


  const capacidadeInstalada =
    quantidade *
    bateria.capacidadeKwh;


  const custoTotal =
    quantidade *
    bateria.preco;


  window.bateriaSelecionada =
    bateria;

  window.quantidadeBaterias =
    quantidade;


  mensagemBaterias.innerHTML = `
    <strong>Bateria selecionada:</strong>
    ${bateria.fabricante}
    ${bateria.modelo}<br>

    <strong>Quantidade:</strong>
    ${quantidade} bateria(s)<br>

    <strong>Capacidade instalada:</strong>
    ${capacidadeInstalada.toFixed(2)} kWh<br>

    <strong>Custo total:</strong>
    R$ ${custoTotal.toFixed(2)}
  `;

}