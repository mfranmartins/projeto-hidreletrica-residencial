// ==========================================================
// dimensionamento.js - Interface do dimensionamento fotovoltaico
// Regras de cálculo: js/solar.js | Persistência: js/dimStorage.js
// ==========================================================
(function () {
  "use strict";
  const S = window.Solar;
  const h = S.esc;
  const $ = function (id) {
    return document.getElementById(id);
  };

  // ---------- Login e imóveis ----------
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }
  const meusImoveis = (JSON.parse(localStorage.getItem("imoveis")) || []).filter(function (i) {
    return String(i.usuarioId) === String(usuario.id);
  });

  let dados = null; // datasets
  let imovel = null;
  const estado = {
    cenario: "sem",
    baseConsumo: null,
    hspFonte: "",
    moduloId: null,
    inversorId: { sem: null, com: null },
    bateriaId: null,
  };
  let ultimo = null; // últimos resultados calculados

  // ---------- Carregamento dos datasets ----------
  function carregar(url, obrigatorio) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.text();
    }).catch(function (e) {
      if (obrigatorio) throw e;
      return "";
    });
  }

  Promise.all([
    carregar("datasets/modulos.csv", true),
    carregar("datasets/inversores.csv", true),
    carregar("datasets/baterias.csv", true),
    carregar("datasets/hsp.csv", false),
  ])
    .then(function (t) {
      dados = S.montarDatasets({ modulos: t[0], inversores: t[1], baterias: t[2], hsp: t[3] });
      iniciar();
    })
    .catch(function (e) {
      console.error(e);
      $("avisoDatasets").innerHTML =
        '<div class="msg-erro"><strong>Não foi possível carregar os datasets de equipamentos.</strong><br>' +
        "Abra o sistema por um servidor local (extensão Live Server do VS Code ou <code>python -m http.server</code>); " +
        "abrir o arquivo diretamente (file://) bloqueia a leitura dos CSV.</div>";
    });

  // ---------- Inicialização ----------
  function iniciar() {
    if (!dados.hsp.length) {
      $("avisoDatasets").innerHTML = '<div class="msg-aviso">Dataset de HSP indisponível: informe a HSP manualmente.</div>';
    }
    $("pr").value = S.CONST.PR_PADRAO;
    $("prJust").value = S.CONST.PR_JUSTIFICATIVA_PADRAO;
    $("tarifa").value = S.CONST.TARIFA_PADRAO;

    $("selCidadeHSP").innerHTML =
      '<option value="">— selecionar —</option>' +
      dados.hsp
        .map(function (l, i) {
          return '<option value="' + i + '">' + h(l.cidade) + " - " + h(l.uf) + " (" + S.fmt(l.hsp, 1) + ")</option>";
        })
        .join("");

    if (!meusImoveis.length) {
      $("selImovel").innerHTML = '<option value="">Nenhuma residência cadastrada</option>';
      $("resumoImovel").innerHTML =
        '<div class="msg-aviso">Você ainda não possui residências cadastradas. ' +
        '<a href="imovel.html">Cadastre uma residência</a> (ou carregue os dados de demonstração) para iniciar.</div>';
      render();
      return;
    }
    const salvo = localStorage.getItem("imovelSelecionado");
    $("selImovel").innerHTML = meusImoveis
      .map(function (i) {
        return '<option value="' + h(i.id) + '">' + h(i.identificacao) + " — " + h(i.endereco) + "</option>";
      })
      .join("");
    const inicial = meusImoveis.find(function (i) {
      return String(i.id) === String(salvo);
    });
    $("selImovel").value = String((inicial || meusImoveis[0]).id);
    selecionarImovel($("selImovel").value, true);

    // eventos
    $("selImovel").addEventListener("change", function () {
      selecionarImovel(this.value, true);
    });
    ["pr", "prJust", "pct", "tarifa", "ligacao", "outrosPct", "autonomia", "eficBat"].forEach(function (id) {
      $(id).addEventListener("input", render);
      $(id).addEventListener("change", render);
    });
    $("hsp").addEventListener("input", function () {
      estado.hspFonte = "Informado manualmente pelo usuário";
      $("selCidadeHSP").value = "";
      render();
    });
    $("selCidadeHSP").addEventListener("change", function () {
      if (this.value === "") return;
      const l = dados.hsp[Number(this.value)];
      $("hsp").value = l.hsp;
      estado.hspFonte = "Dataset hsp.csv — " + l.cidade + "/" + l.uf + ". Fonte: " + l.fonte;
      render();
    });
    document.querySelectorAll('input[name="cenario"]').forEach(function (r) {
      r.addEventListener("change", function () {
        estado.cenario = this.value;
        render();
      });
    });
    $("btnSalvar").addEventListener("click", function () {
      salvar(false);
    });
    $("btnProposta").addEventListener("click", function () {
      salvar(true);
    });

    // delegação de eventos das tabelas de seleção
    document.addEventListener("change", function (e) {
      const t = e.target;
      if (!t || !t.name) return;
      if (t.name === "selModulo") {
        estado.moduloId = t.value;
        estado.inversorId = { sem: null, com: null };
        render();
      } else if (t.name === "selInversor") {
        estado.inversorId[estado.cenario] = t.value;
        render();
      } else if (t.name === "selBateria") {
        estado.bateriaId = t.value;
        render();
      } else if (t.name === "baseConsumo") {
        estado.baseConsumo = t.value;
        render();
      }
    });
    document.addEventListener("click", function (e) {
      const b = e.target.closest ? e.target.closest("[data-remover]") : null;
      if (b && confirm("Remover este dimensionamento salvo?")) {
        DimStorage.remover(b.getAttribute("data-remover"));
        listarSalvos();
      }
    });
  }

  // ---------- Seleção do imóvel (PB01) ----------
  function selecionarImovel(id, restaurar) {
    imovel = meusImoveis.find(function (i) {
      return String(i.id) === String(id);
    });
    if (!imovel) return;
    localStorage.setItem("imovelSelecionado", imovel.id);
    estado.moduloId = null;
    estado.bateriaId = null;
    estado.inversorId = { sem: null, com: null };
    estado.baseConsumo = null;

    // HSP sugerida pela localidade
    const achada = S.buscarHSP(imovel.endereco, dados.hsp);
    $("selCidadeHSP").value = "";
    if (achada) {
      $("hsp").value = achada.hsp;
      estado.hspFonte = "Dataset hsp.csv — " + achada.cidade + "/" + achada.uf + ". Fonte: " + achada.fonte;
    } else {
      $("hsp").value = "";
      estado.hspFonte = "";
    }

    let msgRestaurado = "";
    const salvos = DimStorage.doImovel(usuario.id, imovel.id);
    if (restaurar && salvos.length) {
      aplicarSalvo(salvos[0]);
      msgRestaurado =
        '<div class="msg-info">Restaurado o último dimensionamento salvo em ' + new Date(salvos[0].criadoEm).toLocaleString("pt-BR") + ".</div>";
    }
    const m = $("mensagemSalvar");
    m.innerHTML = msgRestaurado;
    render();
  }

  function aplicarSalvo(reg) {
    const e = reg.entrada || {};
    if (isFinite(e.hsp)) $("hsp").value = e.hsp;
    if (isFinite(e.pr)) $("pr").value = e.pr;
    if (e.prJustificativa !== undefined) $("prJust").value = e.prJustificativa;
    if (isFinite(e.pct)) $("pct").value = e.pct;
    if (isFinite(e.tarifa)) $("tarifa").value = e.tarifa;
    if (e.ligacao) $("ligacao").value = e.ligacao;
    if (isFinite(e.outrosPct)) $("outrosPct").value = e.outrosPct;
    if (isFinite(e.autonomiaH)) $("autonomia").value = e.autonomiaH;
    if (isFinite(e.eficienciaBateria)) $("eficBat").value = e.eficienciaBateria;
    estado.hspFonte = e.hspFonte || estado.hspFonte;
    estado.baseConsumo = e.baseConsumo || null;
    estado.moduloId = e.moduloId || null;
    estado.bateriaId = e.bateriaId || null;
    estado.inversorId = e.inversorIds || { sem: null, com: null };
    estado.cenario = reg.cenarioSelecionado === "com" ? "com" : "sem";
    document.querySelectorAll('input[name="cenario"]').forEach(function (r) {
      r.checked = r.value === estado.cenario;
    });
  }

  // ---------- Leitura das entradas ----------
  function lerEntrada(ref) {
    const outros = $("outrosPct").value === "" ? 0 : S.num($("outrosPct").value);
    return {
      consumo: ref,
      hsp: S.num($("hsp").value),
      pr: S.num($("pr").value),
      prJustificativa: $("prJust").value,
      pct: S.num($("pct").value),
      tarifa: S.num($("tarifa").value),
      ligacao: $("ligacao").value,
      disponibilidadeKwh: S.CONST.DISPONIBILIDADE[$("ligacao").value],
      outrosPct: outros,
      autonomiaH: S.num($("autonomia").value),
      eficienciaBateria: S.num($("eficBat").value),
      moduloId: null,
      inversorId: null,
      bateriaId: estado.bateriaId,
      hspFonte: estado.hspFonte,
      baseConsumo: estado.baseConsumo,
    };
  }

  function dadosDoImovel() {
    const consumos = (JSON.parse(localStorage.getItem("consumos")) || []).filter(function (c) {
      return imovel && String(c.imovelId) === String(imovel.id);
    });
    const aparelhos = (JSON.parse(localStorage.getItem("aparelhos")) || []).filter(function (a) {
      return imovel && String(a.imovelId) === String(imovel.id);
    });
    return { consumos: consumos, aparelhos: aparelhos };
  }

  // ---------- Helpers de HTML ----------
  function metrica(rotulo, valor) {
    return '<div class="metrica"><small>' + rotulo + "</small><strong>" + valor + "</strong></div>";
  }
  function msgs(lista, classe) {
    return lista
      .map(function (m) {
        return '<div class="' + classe + '">' + h(m) + "</div>";
      })
      .join("");
  }
  function linkFonte(item) {
    const url = /^https?:\/\//i.test(item.urlFonte || "") ? item.urlFonte : "";
    const texto = h(item.fornecedor || "fonte") + (item.dataColeta ? " (" + h(item.dataColeta) + ")" : "");
    return url ? '<a href="' + h(url) + '" target="_blank" rel="noopener">' + texto + "</a>" : texto;
  }
  function tabela(cabecalhos, linhas) {
    return (
      '<div class="tabela-wrap"><table class="tabela"><thead><tr>' +
      cabecalhos
        .map(function (c) {
          return "<th>" + c + "</th>";
        })
        .join("") +
      "</tr></thead><tbody>" +
      linhas.join("") +
      "</tbody></table></div>"
    );
  }

  // ---------- Render principal ----------
  function render() {
    if (!dados) return;
    const dd = dadosDoImovel();

    // 1. resumo do imóvel
    if (imovel) {
      $("resumoImovel").innerHTML =
        '<p><strong>' + h(imovel.identificacao) + "</strong> — " + h(imovel.endereco) + " (" + h(imovel.tipo) + ")<br>" +
        '<span class="nota">' + dd.consumos.length + " mês(es) de consumo e " + dd.aparelhos.length +
        " aparelho(s) cadastrados. Nenhum novo cadastro é necessário.</span></p>";
    }

    // 2. consumo de referência
    const ref = S.consumoReferencia(dd.consumos, dd.aparelhos, estado.baseConsumo);
    $("baseConsumoBox").innerHTML =
      '<label><input type="radio" name="baseConsumo" value="historico"' + (ref.base === "historico" ? " checked" : "") +
      (ref.mediaHistoricoKwh === null ? " disabled" : "") + "> Média do histórico</label>" +
      '<label><input type="radio" name="baseConsumo" value="aparelhos"' + (ref.base === "aparelhos" ? " checked" : "") +
      (ref.estimativaAparelhosKwh === null ? " disabled" : "") + "> Estimativa pelos aparelhos</label>";
    $("resumoConsumo").innerHTML = ref.ok
      ? '<div class="metricas">' +
        metrica("Consumo médio mensal", S.fmt(ref.mensalKwh) + " kWh/mês") +
        metrica("Consumo médio diário", S.fmt(ref.diarioKwh) + " kWh/dia") +
        metrica("Potência instalada (aparelhos)", ref.potenciaInstaladaKw === null ? "não cadastrada" : S.fmt(ref.potenciaInstaladaKw) + " kW") +
        metrica("Base do cálculo", h(ref.fonte)) +
        "</div>" +
        '<p class="nota">Unidades: energia em kWh; potência instalada = soma (potência × quantidade) dos aparelhos, em kW. Dia = mês ÷ 30.' +
        (ref.mediaHistoricoKwh !== null && ref.estimativaAparelhosKwh !== null
          ? " Histórico: " + S.fmt(ref.mediaHistoricoKwh) + " kWh/mês; estimativa por aparelhos: " + S.fmt(ref.estimativaAparelhosKwh) + " kWh/mês."
          : "") +
        "</p>" + msgs(ref.erros, "msg-aviso")
      : msgs(ref.erros, "msg-erro");

    // 3. fonte HSP
    $("hspFonteTxt").textContent = estado.hspFonte
      ? "Fonte da HSP: " + estado.hspFonte
      : imovel
        ? 'Localidade "' + imovel.endereco + '" não encontrada no dataset de HSP: informe a HSP manualmente ou escolha uma cidade da lista (consulte o SunData/CRESESB).'
        : "";

    const entrada = lerEntrada(ref);
    const erros = S.validarParametros(entrada);
    $("avisosParametros").innerHTML = msgs(erros, "msg-erro");

    const vazio = '<p class="nota">Corrija os dados acima para continuar.</p>';
    if (erros.length) {
      ultimo = null;
      ["resultadoPotencia", "listaModulos", "listaInversores", "resultados", "comparacao"].forEach(function (id) {
        $(id).innerHTML = vazio;
      });
      $("areaBateria").hidden = estado.cenario !== "com";
      $("resumoBateria").innerHTML = "";
      $("listaBaterias").innerHTML = "";
      listarSalvos();
      return;
    }

    // 4. potência necessária
    const pot = S.potenciaNecessaria(ref.diarioKwh, entrada.hsp, entrada.pr, entrada.pct);
    $("resultadoPotencia").innerHTML =
      '<div class="metricas">' +
      metrica("Consumo diário", S.fmt(pot.consumoDiarioKwh) + " kWh/dia") +
      metrica("Percentual a atender", S.fmt(pot.pctAtendimento, 0) + " %") +
      metrica("HSP", S.fmt(pot.hsp, 2) + " h/dia") +
      metrica("PR", S.fmt(pot.pr, 2)) +
      metrica("Potência necessária", S.fmt(pot.kWp, 2) + " kWp") +
      "</div>" +
      '<p class="nota">Cálculo: P(kWp) = (consumo diário × % de atendimento) ÷ (HSP × PR) = (' + S.fmt(pot.consumoDiarioKwh) + " × " +
      S.fmt(pot.pctAtendimento / 100) + ") ÷ (" + S.fmt(pot.hsp, 2) + " × " + S.fmt(pot.pr, 2) + ") = <strong>" + S.fmt(pot.kWp, 2) + " kWp</strong></p>";

    const comBat = estado.cenario === "com";

    // 5. módulos: avalia todos e define recomendado
    const linhasMod = dados.modulos.map(function (m) {
      const dim = S.dimensionarModulos(m, pot.wp);
      const rank = S.rankearInversores(dados.inversores, m, dim.quantidade, comBat);
      const melhor = rank.find(function (r) {
        return r.compativel;
      });
      return { m: m, dim: dim, melhor: melhor || null, custoEquip: melhor ? dim.custo + melhor.custo : null };
    });
    const compat = linhasMod.filter(function (l) {
      return l.melhor;
    });
    let recomendado = null;
    compat.forEach(function (l) {
      if (!recomendado || l.custoEquip < recomendado.custoEquip) recomendado = l;
    });
    if (!estado.moduloId || !dados.modulos.some(function (m) { return String(m.id) === String(estado.moduloId); })) {
      estado.moduloId = recomendado ? recomendado.m.id : dados.modulos[0].id;
      estado.moduloAuto = true;
    }
    entrada.moduloId = estado.moduloId;

    $("listaModulos").innerHTML =
      '<p class="nota">A quantidade é arredondada para cima para atingir ao menos ' + S.fmt(pot.wp, 0) + " Wp. Dados: datasets/modulos.csv.</p>" +
      tabela(
        ["", "Módulo", "Potência", "Eficiência", "Quantidade", "Potência instalada", "Preço unit.", "Custo dos módulos", "Compatível c/ inversor", "Fonte"],
        linhasMod.map(function (l) {
          const sel = String(l.m.id) === String(estado.moduloId);
          return (
            '<tr class="' + (sel ? "sel" : l.melhor ? "" : "off") + '"><td><input type="radio" name="selModulo" value="' + h(l.m.id) + '"' + (sel ? " checked" : "") + "></td>" +
            "<td>" + h(l.m.id) + " — " + h(l.m.fabricante) + " " + h(l.m.modelo) +
            (recomendado && recomendado.m.id === l.m.id ? ' <span class="badge rec">menor custo compatível</span>' : "") + "</td>" +
            '<td class="num">' + S.fmt(l.m.potenciaWp, 0) + " Wp</td>" +
            '<td class="num">' + S.fmt(l.m.eficiencia, 2) + " %</td>" +
            '<td class="num">' + l.dim.quantidade + "</td>" +
            '<td class="num">' + S.fmt(l.dim.potenciaInstaladaKwp, 2) + " kWp</td>" +
            '<td class="num">' + S.brl(l.m.preco) + "</td>" +
            '<td class="num">' + S.brl(l.dim.custo) + "</td>" +
            "<td>" + (l.melhor ? '<span class="badge ok">sim</span>' : '<span class="badge no">nenhum inversor</span>') + "</td>" +
            "<td>" + linkFonte(l.m) + "</td></tr>"
          );
        }),
      );

    // cenários
    const eSem = Object.assign({}, entrada, { inversorId: estado.inversorId.sem });
    const eCom = Object.assign({}, entrada, { inversorId: estado.inversorId.com });
    const sem = S.calcularCenario(eSem, dados, false);
    const com = S.calcularCenario(eCom, dados, true);
    const ativo = comBat ? com : sem;
    ultimo = { entrada: entrada, sem: sem, com: com, ativo: ativo, ref: ref, pot: pot };

    // 6. inversores
    renderInversores(ativo, comBat);

    // 7. baterias
    $("areaBateria").hidden = !comBat;
    renderBaterias(entrada, com, comBat);

    // 8. resultados
    renderResultados(ativo, entrada);

    // 9. comparação
    renderComparacao(sem, com);

    listarSalvos();
  }

  // ---------- Inversores ----------
  function renderInversores(ativo, comBat) {
    const rank = ativo.rankingInversores;
    if (!rank) {
      $("listaInversores").innerHTML = msgs(ativo.erros, "msg-erro");
      return;
    }
    const escolhidoId = ativo.inversor ? ativo.inversor.inversor.id : null;
    let html =
      '<p class="nota">Os inversores são ordenados por adequação técnica (relação FV/inversor e arranjo de strings) e só depois por preço — o menor preço isolado não define a escolha. ' +
      "Voc corrigida para baixa temperatura (fator " + S.CONST.FATOR_VOC_FRIO + "). Eficiência do inversor: o dataset atual não informa este dado." +
      (comBat ? " No cenário com baterias só inversores híbridos são considerados." : "") + "</p>";
    html += tabela(
      ["", "Inversor", "Tipo", "Potência nominal", "Pot. máx. FV", "MPPT (faixa / nº)", "Preço", "Status e arranjo", "Fonte"],
      rank.map(function (r) {
        const inv = r.inversor;
        const sel = String(inv.id) === String(escolhidoId);
        let status;
        if (r.compativel) {
          const a = r.arranjo;
          status =
            '<span class="badge ok">compatível</span>' + (r.recomendado ? ' <span class="badge rec">recomendado</span>' : "") +
            "<br>" + r.quantidade + " inversor(es); " + a.strings + " string(s) × " + a.modulosPorString + " módulos<br>" +
            "FV/inversor: " + S.fmt(r.fdi, 2) + " · Voc corr.: " + S.fmt(a.vocCorrigida, 0) + " V · Vmp: " + S.fmt(a.vmpString, 0) + " V · Isc: " + S.fmt(a.iscString, 1) + " A" +
            (r.quantidade > 1 ? "<br>Custo: " + S.brl(r.custo) : "");
        } else {
          status = '<span class="badge no">incompatível</span><br>' + r.motivos.map(h).join("<br>");
        }
        return (
          '<tr class="' + (sel ? "sel" : r.compativel ? "" : "off") + '"><td>' +
          (r.compativel ? '<input type="radio" name="selInversor" value="' + h(inv.id) + '"' + (sel ? " checked" : "") + ">" : "") + "</td>" +
          "<td>" + h(inv.id) + " — " + h(inv.fabricante) + " " + h(inv.modelo) + "</td><td>" + h(inv.tipo) + "</td>" +
          '<td class="num">' + S.fmt(inv.potenciaNominal, 0) + " W</td>" +
          '<td class="num">' + S.fmt(inv.potenciaMaxFV, 0) + " W</td>" +
          "<td>" + inv.mpptMin + "–" + inv.mpptMax + " V / " + inv.numeroMPPT + "</td>" +
          '<td class="num">' + S.brl(inv.preco) + "</td><td>" + status + "</td><td>" + linkFonte(inv) + "</td></tr>"
        );
      }),
    );
    if (!ativo.ok && ativo.erros.length) html = msgs(ativo.erros, "msg-erro") + html;
    $("listaInversores").innerHTML = html;
  }

  // ---------- Baterias ----------
  function renderBaterias(entrada, com, comBat) {
    if (!comBat) {
      $("resumoBateria").innerHTML = "";
      $("listaBaterias").innerHTML = "";
      return;
    }
    const errosBat = [];
    if (!isFinite(entrada.autonomiaH) || entrada.autonomiaH <= 0) errosBat.push("Informe uma autonomia em horas maior que zero.");
    else if (entrada.autonomiaH > 240) errosBat.push("A autonomia informada é irreal (máximo aceito: 240 horas).");
    if (!isFinite(entrada.eficienciaBateria) || entrada.eficienciaBateria <= 0 || entrada.eficienciaBateria > 1) {
      errosBat.push("A eficiência da bateria deve estar entre 0 e 1.");
    }
    if (errosBat.length) {
      $("resumoBateria").innerHTML = msgs(errosBat, "msg-erro");
      $("listaBaterias").innerHTML = "";
      return;
    }
    const opcoes = dados.baterias.map(function (b) {
      return S.dimensionarBateria(b, { diarioKwh: entrada.consumo.diarioKwh, autonomiaH: entrada.autonomiaH, eficiencia: entrada.eficienciaBateria });
    });
    let rec = null;
    opcoes.forEach(function (o) {
      if (!rec || o.custo < rec.custo) rec = o;
    });
    const selId = com.ok && com.bateria ? com.bateria.bateria.id : rec.bateria.id;
    const sel = opcoes.find(function (o) {
      return String(o.bateria.id) === String(selId);
    }) || rec;

    $("resumoBateria").innerHTML =
      '<div class="metricas">' +
      metrica("Autonomia considerada", S.fmt(entrada.autonomiaH, 1) + " h") +
      metrica("Energia necessária (útil)", S.fmt(sel.energiaNecessariaKwh) + " kWh") +
      metrica("DoD utilizado", S.fmt(sel.dodUtilizado, 0) + " % (da bateria)") +
      metrica("Eficiência utilizada", S.fmt(entrada.eficienciaBateria, 2)) +
      metrica("Capacidade nominal calculada", S.fmt(sel.capacidadeNominalCalculadaKwh) + " kWh") +
      metrica("Selecionada", h(sel.bateria.fabricante + " " + sel.bateria.modelo) + " × " + sel.quantidade) +
      metrica("Capacidade total instalada", S.fmt(sel.capacidadeInstaladaKwh) + " kWh") +
      "</div>" +
      '<p class="nota">Energia necessária = consumo diário ÷ 24 × autonomia (h). Capacidade nominal = energia necessária ÷ (DoD × eficiência).</p>';

    $("listaBaterias").innerHTML = tabela(
      ["", "Bateria", "Tecnologia", "Tensão", "Ah", "Energia nominal", "DoD", "Ciclos", "Preço unit.", "Qtd.", "Capacidade instalada", "Custo total", "Fonte"],
      opcoes.map(function (o) {
        const b = o.bateria;
        const s = String(b.id) === String(sel.bateria.id);
        return (
          '<tr class="' + (s ? "sel" : "") + '"><td><input type="radio" name="selBateria" value="' + h(b.id) + '"' + (s ? " checked" : "") + "></td>" +
          "<td>" + h(b.id) + " — " + h(b.fabricante) + " " + h(b.modelo) + (rec.bateria.id === b.id ? ' <span class="badge rec">menor custo</span>' : "") + "</td>" +
          "<td>" + h(b.tecnologia) + '</td><td class="num">' + S.fmt(b.tensaoNominal, 1) + " V</td>" +
          '<td class="num">' + (b.capacidadeAh ? S.fmt(b.capacidadeAh, 0) : "n/d") + "</td>" +
          '<td class="num">' + S.fmt(b.capacidadeKwh) + " kWh</td>" +
          '<td class="num">' + S.fmt(b.dod, 0) + " %</td>" +
          '<td class="num" title="' + h(b.condicoesCiclos) + '">' + (b.ciclos ? S.fmt(b.ciclos, 0) : "n/d") + "</td>" +
          '<td class="num">' + S.brl(b.preco) + '</td><td class="num">' + o.quantidade + "</td>" +
          '<td class="num">' + S.fmt(o.capacidadeInstaladaKwh) + " kWh</td>" +
          '<td class="num">' + S.brl(o.custo) + "</td><td>" + linkFonte(b) + "</td></tr>"
        );
      }),
    );
  }

  // ---------- Resultados ----------
  function renderResultados(r, entrada) {
    if (!r.ok) {
      $("resultados").innerHTML = msgs(r.erros, "msg-erro");
      return;
    }
    const g = r.geracao;
    const o = r.orcamento;
    const e = r.economia;
    const pb = r.payback;
    let html =
      '<h3>Dimensionamento</h3><div class="metricas">' +
      metrica("Potência necessária", S.fmt(r.potencia.kWp, 2) + " kWp") +
      metrica("Potência instalada", S.fmt(r.modulos.potenciaInstaladaKwp, 2) + " kWp") +
      metrica("Módulos", r.modulos.quantidade + " × " + S.fmt(r.modulos.potenciaIndividualWp, 0) + " Wp") +
      metrica("Inversor", r.inversor.quantidade + " × " + h(r.inversor.inversor.fabricante + " " + r.inversor.inversor.modelo)) +
      "</div>" +
      '<p class="nota">Módulo: ' + h(r.modulos.modulo.fabricante + " " + r.modulos.modulo.modelo) + ".</p>" +
      '<h3>Geração e atendimento</h3><div class="metricas">' +
      metrica("Geração diária", S.fmt(g.geracaoDiariaKwh) + " kWh/dia") +
      metrica("Geração mensal", S.fmt(g.geracaoMensalKwh) + " kWh/mês") +
      metrica("Consumo mensal", S.fmt(g.consumoMensalKwh) + " kWh/mês") +
      metrica("Atendimento do consumo", S.fmt(g.atendimentoPct, 1) + " %") +
      metrica("Energia gerada e consumida", S.fmt(g.energiaConsumidaKwh) + " kWh/mês") +
      metrica("Excedente (vira crédito)", S.fmt(g.excedenteKwh) + " kWh/mês") +
      "</div>" +
      '<p class="nota">A geração usa a potência efetivamente instalada (' + S.fmt(r.modulos.potenciaInstaladaKwp, 2) + " kWp × " + S.fmt(entrada.hsp, 2) + " × " + S.fmt(entrada.pr, 2) + ").</p>";

    if (r.bateria) {
      const b = r.bateria;
      html +=
        '<h3>Armazenamento</h3><div class="metricas">' +
        metrica("Autonomia", S.fmt(b.autonomiaH, 1) + " h") +
        metrica("Energia necessária", S.fmt(b.energiaNecessariaKwh) + " kWh") +
        metrica("Capacidade nominal calculada", S.fmt(b.capacidadeNominalCalculadaKwh) + " kWh") +
        metrica("Bateria", b.quantidade + " × " + h(b.bateria.fabricante + " " + b.bateria.modelo)) +
        metrica("Capacidade total instalada", S.fmt(b.capacidadeInstaladaKwh) + " kWh") +
        "</div>";
    }

    html +=
      "<h3>Orçamento</h3>" +
      tabela(
        ["Equipamento", "Fabricante / modelo", "Qtd.", "Preço unitário", "Subtotal", "Fonte do preço"],
        o.linhas
          .map(function (l) {
            return (
              "<tr><td>" + h(l.descricao) + "</td><td>" + h(l.fabricanteModelo) + '</td><td class="num">' + l.quantidade +
              '</td><td class="num">' + S.brl(l.precoUnitario) + '</td><td class="num">' + S.brl(l.subtotal) + "</td><td>" + h(l.fonte) + "</td></tr>"
            );
          })
          .concat(['<tr><th colspan="4">Total</th><th class="num">' + S.brl(o.total) + "</th><th></th></tr>"]),
      ) +
      '<h3>Economia e payback</h3><div class="metricas">' +
      metrica("Tarifa utilizada", S.brl(e.tarifa) + "/kWh") +
      metrica("Energia compensada", S.fmt(e.energiaCompensadaKwh) + " kWh/mês") +
      metrica("Economia mensal", S.brl(e.economiaMensal)) +
      metrica("Economia anual", S.brl(e.economiaAnual)) +
      metrica("Payback simples", pb.calculavel ? "≈ " + S.fmt(pb.anos, 1) + " anos (" + pb.meses + " meses)" : "não calculável") +
      "</div>" +
      '<div class="msg-info"><strong>Premissas:</strong> energia compensada = menor valor entre a geração e (consumo − taxa mínima de ' + g.disponibilidadeKwh +
      " kWh/mês da ligação " + h(entrada.ligacao) + "); economia = energia compensada × tarifa; payback simples = investimento ÷ economia anual. " +
      "Não considera reajuste de tarifa, degradação dos módulos, manutenção, troca de inversor/baterias, financiamento nem custos de instalação (salvo o percentual informado). " +
      "O resultado é uma <strong>estimativa de payback simples</strong>, não uma previsão financeira exata.</div>";
    if (r.bateria) {
      html += '<div class="msg-info">As baterias aumentam o investimento e dão autonomia na falta de rede, mas na compensação de energia (net metering) a economia mensal estimada é a mesma do sistema sem baterias.</div>';
    }
    html += msgs(r.avisos, "msg-aviso");
    $("resultados").innerHTML = html;
  }

  // ---------- Comparação (PB14) ----------
  function renderComparacao(sem, com) {
    function col(r, f, vazio) {
      return r.ok ? f(r) : vazio || "—";
    }
    const linhas = [
      ["Potência FV necessária", function (r) { return S.fmt(r.potencia.kWp, 2) + " kWp"; }],
      ["Potência FV instalada", function (r) { return S.fmt(r.modulos.potenciaInstaladaKwp, 2) + " kWp"; }],
      ["Módulos", function (r) { return r.modulos.quantidade + " × " + h(r.modulos.modulo.fabricante + " " + r.modulos.modulo.modelo); }],
      ["Inversor", function (r) { return r.inversor.quantidade + " × " + h(r.inversor.inversor.fabricante + " " + r.inversor.inversor.modelo); }],
      ["Geração mensal", function (r) { return S.fmt(r.geracao.geracaoMensalKwh) + " kWh"; }],
      ["Atendimento do consumo", function (r) { return S.fmt(r.geracao.atendimentoPct, 1) + " %"; }],
      ["Armazenamento instalado", function (r) { return r.bateria ? S.fmt(r.bateria.capacidadeInstaladaKwh) + " kWh (" + r.bateria.quantidade + " × " + h(r.bateria.bateria.modelo) + ")" : "Sem baterias"; }],
      ["Autonomia", function (r) { return r.bateria ? S.fmt(r.bateria.autonomiaH, 1) + " h" : "—"; }],
      ["Investimento total", function (r) { return "<strong>" + S.brl(r.orcamento.total) + "</strong>"; }],
      ["Economia anual", function (r) { return S.brl(r.economia.economiaAnual); }],
      ["Payback simples", function (r) { return r.payback.calculavel ? "≈ " + S.fmt(r.payback.anos, 1) + " anos" : "não calculável"; }],
    ];
    const ativoSem = estado.cenario === "sem";
    let html = tabela(
      ["Item", "Sem baterias" + (ativoSem ? " ✔ selecionado" : ""), "Com baterias" + (!ativoSem ? " ✔ selecionado" : "")],
      linhas.map(function (l) {
        return "<tr><th>" + l[0] + "</th><td>" + col(sem, l[1]) + "</td><td>" + col(com, l[1]) + "</td></tr>";
      }),
    );
    if (sem.ok && com.ok) {
      html += '<p class="nota">Custo adicional do armazenamento: <strong>' + S.brl(com.orcamento.total - sem.orcamento.total) + "</strong>.</p>";
    }
    if (!sem.ok) html += "<h4>Sem baterias</h4>" + msgs(sem.erros, "msg-erro");
    if (!com.ok) html += "<h4>Com baterias</h4>" + msgs(com.erros, "msg-erro");
    $("comparacao").innerHTML = html;
  }

  // ---------- Salvar (PB20) e proposta (PB21) ----------
  function compactar(r) {
    if (!r) return null;
    const c = JSON.parse(JSON.stringify(r));
    delete c.rankingInversores;
    return c;
  }

  function salvar(abrirProposta) {
    const msg = $("mensagemSalvar");
    if (!imovel) {
      msg.innerHTML = '<div class="msg-erro">Selecione uma residência para salvar.</div>';
      return;
    }
    if (!ultimo || !ultimo.ativo || !ultimo.ativo.ok) {
      msg.innerHTML = '<div class="msg-erro">Não é possível salvar: o cenário selecionado tem pendências. Corrija os avisos em vermelho.</div>';
      return;
    }
    const en = Object.assign({}, ultimo.entrada, { moduloId: estado.moduloId, inversorIds: estado.inversorId, bateriaId: estado.bateriaId });
    const consumoSnap = Object.assign({}, ultimo.entrada.consumo);
    en.consumo = consumoSnap;
    const registro = {
      id: "dim-" + Date.now(),
      usuarioId: usuario.id,
      imovelId: imovel.id,
      imovel: { identificacao: imovel.identificacao, endereco: imovel.endereco, tipo: imovel.tipo },
      criadoEm: new Date().toISOString(),
      cenarioSelecionado: estado.cenario,
      entrada: en,
      cenarios: { sem: compactar(ultimo.sem), com: compactar(ultimo.com) },
    };
    DimStorage.salvar(registro);
    if (abrirProposta) {
      window.location.href = "proposta.html?id=" + encodeURIComponent(registro.id);
      return;
    }
    msg.innerHTML = '<div class="msg-ok">Dimensionamento salvo com sucesso. <a href="proposta.html?id=' + encodeURIComponent(registro.id) + '">Abrir proposta</a></div>';
    listarSalvos();
  }

  function listarSalvos() {
    if (!imovel) {
      $("salvos").innerHTML = "";
      return;
    }
    const lista = DimStorage.doImovel(usuario.id, imovel.id);
    $("salvos").innerHTML = lista.length
      ? "<h3>Dimensionamentos salvos desta residência</h3>" +
        lista
          .map(function (d) {
            const r = d.cenarios[d.cenarioSelecionado] || {};
            return (
              '<div class="card">' + new Date(d.criadoEm).toLocaleString("pt-BR") + " — cenário " +
              (d.cenarioSelecionado === "com" ? "com baterias" : "sem baterias") +
              (r.orcamento ? " — " + S.fmt(r.modulos.potenciaInstaladaKwp, 2) + " kWp — " + S.brl(r.orcamento.total) : "") +
              ' · <a href="proposta.html?id=' + encodeURIComponent(d.id) + '">Abrir proposta</a> · <a href="#" data-remover="' + h(d.id) +
              '" onclick="return false">Remover</a></div>'
            );
          })
          .join("")
      : '<p class="nota">Nenhum dimensionamento salvo para esta residência.</p>';
  }
})();
