// ==========================================================
// solar.js - Regras de negócio do dimensionamento fotovoltaico
// Não depende do DOM: pode ser testado em Node (ver tests/).
// Todos os valores de equipamentos vêm dos datasets (CSV).
// ==========================================================
(function (root) {
  "use strict";

  // ---------- Premissas (constantes documentadas) ----------
  const CONST = {
    DIAS_MES: 30, // mesma convenção usada no restante do sistema
    MESES_ANO: 12,
    PR_PADRAO: 0.75,
    PR_JUSTIFICATIVA_PADRAO:
      "Valor típico para sistemas residenciais: considera perdas por temperatura, " +
      "sujeira, cabeamento, inversor e sombreamento leve (faixa usual 0,70 a 0,85).",
    HSP_PADRAO_MANUAL: null,
    TARIFA_PADRAO: 0.95, // R$/kWh - referência editável
    EFICIENCIA_BATERIA_PADRAO: 0.9, // eficiência de ida e volta (round-trip)
    FATOR_VOC_FRIO: 1.1, // correção da Voc para baixas temperaturas
    FDI_MIN: 0.4, // relação Pdc/Pac mínima aceita (abaixo disso o inversor é considerado excessivo)
    FDI_IDEAL: 1.2, // relação Pdc/Pac considerada ideal
    MAX_INVERSORES: 3,
    DISPONIBILIDADE: { monofasico: 30, bifasico: 50, trifasico: 100 }, // kWh/mês
  };

  // ---------- Utilidades ----------
  function num(x) {
    if (x === null || x === undefined || x === "") return NaN;
    return Number(String(x).replace(",", "."));
  }
  function arred(x, casas) {
    const f = Math.pow(10, casas === undefined ? 2 : casas);
    return Math.round((x + Number.EPSILON) * f) / f;
  }
  function brl(x) {
    if (!isFinite(x)) return "—";
    return x.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function fmt(x, casas) {
    if (!isFinite(x)) return "—";
    return x.toLocaleString("pt-BR", {
      minimumFractionDigits: casas === undefined ? 2 : casas,
      maximumFractionDigits: casas === undefined ? 2 : casas,
    });
  }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function normalizarTexto(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  // ---------- Leitura de datasets (CSV separado por ;) ----------
  function parseCSV(texto) {
    const linhas = String(texto)
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(function (l) {
        return l.trim() !== "";
      });
    if (linhas.length < 2) return [];
    const cab = linhas[0].split(";").map(function (s) {
      return s.trim();
    });
    return linhas.slice(1).map(function (linha) {
      const v = linha.split(";");
      const o = {};
      cab.forEach(function (c, i) {
        o[c] = (v[i] === undefined ? "" : v[i]).trim();
      });
      return o;
    });
  }

  function fonte(r) {
    return {
      fornecedor: r.fornecedor || "",
      dataColeta: r.data_coleta || "",
      urlFonte: r.url_fonte || "",
    };
  }

  function mapModulo(r) {
    return Object.assign(
      {
        id: r.id,
        fabricante: r.fabricante,
        modelo: r.modelo,
        potenciaWp: num(r.potencia_wp),
        voc: num(r.voc_v),
        isc: num(r.isc_a),
        vmp: num(r.vmp_v),
        imp: num(r.imp_a),
        eficiencia: num(r.eficiencia_pct),
        preco: num(r.preco_brl),
      },
      fonte(r),
    );
  }
  function mapInversor(r) {
    return Object.assign(
      {
        id: r.id,
        fabricante: r.fabricante,
        modelo: r.modelo,
        tipo: r.tipo,
        potenciaNominal: num(r.potencia_nominal_w),
        potenciaMaxFV: num(r.potencia_max_fv_w),
        tensaoMaxEntrada: num(r.tensao_max_entrada_v),
        mpptMin: num(r.faixa_mppt_min_v),
        mpptMax: num(r.faixa_mppt_max_v),
        correnteMaxEntrada: num(r.corrente_max_entrada_a),
        numeroMPPT: num(r.numero_mppt),
        compativelBateria: String(r.compativel_bateria).toLowerCase() === "true",
        // O dataset atual não traz eficiência do inversor (PB07-T02).
        // Se a coluna "eficiencia_pct" for adicionada ao CSV, é usada automaticamente.
        eficiencia: r.eficiencia_pct ? num(r.eficiencia_pct) : null,
        preco: num(r.preco_brl),
      },
      fonte(r),
    );
  }
  function mapBateria(r) {
    return Object.assign(
      {
        id: r.id,
        fabricante: r.fabricante,
        modelo: r.modelo,
        tecnologia: r.tecnologia,
        tensaoNominal: num(r.tensao_nominal_v),
        capacidadeAh: r.capacidade_ah ? num(r.capacidade_ah) : null,
        capacidadeKwh: num(r.capacidade_kwh),
        dod: num(r.dod_pct),
        ciclos: r.ciclos ? num(r.ciclos) : null,
        preco: num(r.preco_brl),
        condicoesCiclos: r.condicoes_ciclos || "",
        correnteMaxCarga: num(r.corrente_max_carga_a),
        correnteMaxDescarga: num(r.corrente_max_descarga_a),
        tensaoOperacionalMin: num(r.tensao_operacional_min_v),
        tensaoOperacionalMax: num(r.tensao_operacional_max_v),
        comunicacao: r.comunicacao || "",
      },
      fonte(r),
    );
  }
  function mapHSP(r) {
    return {
      cidade: r.cidade,
      uf: r.uf,
      hsp: num(r.hsp_kwh_m2_dia),
      fonte: r.fonte,
      observacao: r.observacao || "",
    };
  }

  function dadosValidos(lista, campos) {
    return lista.filter(function (item) {
      return campos.every(function (c) {
        return isFinite(item[c]) && item[c] > 0;
      });
    });
  }

  // Aceita os textos dos CSV e devolve os datasets prontos.
  function montarDatasets(textos) {
    const modulos = dadosValidos(
      parseCSV(textos.modulos).map(mapModulo),
      ["potenciaWp", "voc", "isc", "vmp", "preco"],
    );
    const inversores = dadosValidos(
      parseCSV(textos.inversores).map(mapInversor),
      ["potenciaNominal", "potenciaMaxFV", "tensaoMaxEntrada", "mpptMin", "mpptMax", "correnteMaxEntrada", "numeroMPPT", "preco"],
    );
    const baterias = dadosValidos(
      parseCSV(textos.baterias).map(mapBateria),
      ["capacidadeKwh", "dod", "preco"],
    );
    const hsp = dadosValidos(parseCSV(textos.hsp || "").map(mapHSP), ["hsp"]);
    return { modulos: modulos, inversores: inversores, baterias: baterias, hsp: hsp };
  }

  // Busca a HSP da localidade do imóvel no dataset (PB03-T01/T02).
  function buscarHSP(endereco, tabelaHSP) {
    const alvo = normalizarTexto(endereco);
    let melhor = null;
    (tabelaHSP || []).forEach(function (linha) {
      const cidade = normalizarTexto(linha.cidade);
      if (cidade && alvo.indexOf(cidade) !== -1) {
        if (!melhor || cidade.length > normalizarTexto(melhor.cidade).length) melhor = linha;
      }
    });
    return melhor;
  }

  // ---------- Consumo de referência (PB02) ----------
  function consumoReferencia(consumos, aparelhos, base) {
    const hist = (consumos || [])
      .map(function (c) {
        return Number(c.consumo);
      })
      .filter(function (v) {
        return isFinite(v);
      });
    const negativos = hist.filter(function (v) {
      return v < 0;
    }).length;
    const validos = hist.filter(function (v) {
      return v >= 0;
    });
    const mediaHist = validos.length
      ? validos.reduce(function (a, b) {
          return a + b;
        }, 0) / validos.length
      : null;

    let estimativa = 0;
    let potW = 0;
    (aparelhos || []).forEach(function (a) {
      estimativa += Number(a.consumoMensal) || 0;
      potW += (Number(a.potencia) || 0) * (Number(a.quantidade) || 0);
    });
    const temAparelhos = (aparelhos || []).length > 0;

    let escolha = base;
    if (!escolha || (escolha === "historico" && mediaHist === null)) {
      escolha = mediaHist !== null ? "historico" : temAparelhos ? "aparelhos" : null;
    }
    if (escolha === "aparelhos" && !temAparelhos) {
      escolha = mediaHist !== null ? "historico" : null;
    }

    const erros = [];
    if (negativos > 0) {
      erros.push(negativos + " registro(s) de consumo negativo foram ignorados.");
    }
    let mensal = null;
    if (escolha === "historico") mensal = mediaHist;
    if (escolha === "aparelhos") mensal = estimativa;

    if (mensal === null || !(mensal > 0)) {
      erros.push(
        "Não há consumo válido (maior que zero) para o dimensionamento. Cadastre o histórico de consumo ou os aparelhos do imóvel.",
      );
      mensal = null;
    }
    return {
      ok: mensal !== null,
      base: escolha,
      fonte:
        escolha === "historico"
          ? "Média do histórico de consumo (" + validos.length + " mês(es))"
          : escolha === "aparelhos"
            ? "Estimativa pelos aparelhos cadastrados"
            : "—",
      mensalKwh: mensal,
      diarioKwh: mensal === null ? null : mensal / CONST.DIAS_MES,
      meses: validos.length,
      mediaHistoricoKwh: mediaHist,
      estimativaAparelhosKwh: temAparelhos ? estimativa : null,
      quantidadeAparelhos: (aparelhos || []).length,
      potenciaInstaladaKw: temAparelhos ? potW / 1000 : null,
      erros: erros,
    };
  }

  // ---------- Validação de parâmetros (PB18) ----------
  function validarParametros(p) {
    const e = [];
    if (!p.consumo || !p.consumo.ok || !(p.consumo.diarioKwh > 0)) {
      e.push("Consumo de referência inválido ou ausente: o consumo deve ser maior que zero.");
    }
    if (!isFinite(p.hsp)) e.push("Informe a HSP (Horas de Sol Pico) da localidade.");
    else if (p.hsp <= 0) e.push("A HSP deve ser maior que zero.");
    else if (p.hsp > 12) e.push("A HSP informada (" + p.hsp + ") é irreal: o máximo físico é cerca de 12 h/dia.");

    if (!isFinite(p.pr)) e.push("Informe o Performance Ratio (PR).");
    else if (p.pr <= 0 || p.pr > 1) e.push("O PR deve estar entre 0 (exclusivo) e 1.");
    if (p.prJustificativa !== undefined && !String(p.prJustificativa).trim()) {
      e.push("Justifique o PR adotado (campo obrigatório).");
    }

    if (!isFinite(p.pct) || p.pct <= 0 || p.pct > 100) {
      e.push("O percentual de atendimento deve estar entre 1% e 100%.");
    }
    if (!isFinite(p.tarifa) || p.tarifa <= 0) {
      e.push("Informe uma tarifa de energia maior que zero (R$/kWh).");
    }
    if (isFinite(p.outrosPct) && p.outrosPct < 0) {
      e.push("O percentual de outros custos não pode ser negativo.");
    }
    return e;
  }

  // ---------- Potência necessária (PB04) ----------
  function potenciaNecessaria(diarioKwh, hsp, pr, pct) {
    const energiaAlvo = diarioKwh * (pct / 100); // kWh/dia a gerar
    const kwp = energiaAlvo / (hsp * pr);
    return {
      consumoDiarioKwh: diarioKwh,
      pctAtendimento: pct,
      energiaAlvoDiariaKwh: energiaAlvo,
      hsp: hsp,
      pr: pr,
      kWp: kwp,
      wp: kwp * 1000,
    };
  }

  // ---------- Módulos (PB05/PB06) ----------
  function dimensionarModulos(modulo, potenciaNecessariaWp) {
    if (!modulo || !(modulo.potenciaWp > 0)) return null;
    const qtd = Math.max(1, Math.ceil(potenciaNecessariaWp / modulo.potenciaWp - 1e-9));
    const instWp = qtd * modulo.potenciaWp;
    return {
      modulo: modulo,
      quantidade: qtd,
      potenciaIndividualWp: modulo.potenciaWp,
      potenciaInstaladaWp: instWp,
      potenciaInstaladaKwp: instWp / 1000,
      custo: qtd * modulo.preco,
    };
  }

  // ---------- Inversor: compatibilidade com o arranjo (PB07/PB25/PB27) ----------
  // Testa uma divisão em S strings de módulos em série por MPPT.
  function testarStrings(inv, mod, qtd, S) {
    const nBaixo = Math.floor(qtd / S);
    const nAlto = Math.ceil(qtd / S);
    const tamanhos = nBaixo === nAlto ? [nAlto] : [nBaixo, nAlto];
    const motivos = [];
    tamanhos.forEach(function (n) {
      if (n < 1) {
        motivos.push("Módulos insuficientes para formar " + S + " strings.");
        return;
      }
      const voc = n * mod.voc * CONST.FATOR_VOC_FRIO;
      const vmp = n * mod.vmp;
      if (voc > inv.tensaoMaxEntrada) {
        motivos.push(
          "Voc corrigida da string (" + fmt(voc, 1) + " V com " + n + " módulos) acima do máximo do inversor (" + inv.tensaoMaxEntrada + " V).",
        );
      }
      if (vmp < inv.mpptMin) {
        motivos.push("Vmp da string (" + fmt(vmp, 1) + " V) abaixo da faixa MPPT (mín. " + inv.mpptMin + " V).");
      }
      if (vmp > inv.mpptMax) {
        motivos.push("Vmp da string (" + fmt(vmp, 1) + " V) acima da faixa MPPT (máx. " + inv.mpptMax + " V).");
      }
    });
    if (mod.isc > inv.correnteMaxEntrada) {
      motivos.push("Isc do módulo (" + fmt(mod.isc, 2) + " A) acima da corrente máxima de entrada (" + inv.correnteMaxEntrada + " A).");
    }
    const maxN = nAlto;
    return {
      ok: motivos.length === 0,
      motivos: motivos,
      strings: S,
      modulosPorString: tamanhos.length === 1 ? String(tamanhos[0]) : nBaixo + " a " + nAlto,
      vocString: maxN * mod.voc,
      vocCorrigida: maxN * mod.voc * CONST.FATOR_VOC_FRIO,
      vmpString: maxN * mod.vmp,
      iscString: mod.isc,
    };
  }

  // Avalia um único inversor para um grupo de módulos.
  function avaliarGrupo(inv, mod, qtd) {
    const pdc = qtd * mod.potenciaWp;
    const fdi = pdc / inv.potenciaNominal;
    const motivos = [];
    if (pdc > inv.potenciaMaxFV) {
      motivos.push("Potência FV (" + fmt(pdc, 0) + " W) acima do máximo do inversor (" + inv.potenciaMaxFV + " W).");
    }
    if (fdi < CONST.FDI_MIN) {
      motivos.push("Inversor muito superdimensionado (relação FV/inversor de " + fmt(fdi, 2) + ", mínimo " + CONST.FDI_MIN + ").");
    }
    let melhor = null;
    for (let S = 1; S <= inv.numeroMPPT; S++) {
      const t = testarStrings(inv, mod, qtd, S);
      if (!melhor || (t.ok && !melhor.ok) || (!melhor.ok && !t.ok && t.motivos.length < melhor.motivos.length)) {
        melhor = t;
        if (t.ok) break;
      }
    }
    const todos = motivos.concat(melhor ? melhor.motivos : []);
    return { ok: todos.length === 0, motivos: todos, pdc: pdc, fdi: fdi, arranjo: melhor };
  }

  // Avalia o inversor (podendo usar de 1 a MAX_INVERSORES unidades iguais).
  function avaliarInversor(inv, mod, qtdModulos, comBateria) {
    const avisos = [];
    let primeiraFalha = null;
    if (comBateria && !inv.compativelBateria) {
      return {
        inversor: inv,
        compativel: false,
        motivos: ["Inversor não é híbrido/compatível com baterias (cenário com armazenamento)."],
        avisos: avisos,
      };
    }
    for (let k = 1; k <= CONST.MAX_INVERSORES; k++) {
      const maior = Math.ceil(qtdModulos / k);
      const menor = Math.floor(qtdModulos / k);
      if (menor < 1) break;
      const gMaior = avaliarGrupo(inv, mod, maior);
      const gMenor = menor === maior ? gMaior : avaliarGrupo(inv, mod, menor);
      if (k === 1) primeiraFalha = gMaior;
      if (gMaior.ok && gMenor.ok) {
        const pdcTotal = qtdModulos * mod.potenciaWp;
        if (gMaior.fdi > 1.5) avisos.push("Relação FV/inversor alta (" + fmt(gMaior.fdi, 2) + "): pode haver limitação de potência (clipping).");
        if (gMaior.fdi < 0.8) avisos.push("Inversor folgado para o arranjo (relação FV/inversor de " + fmt(gMaior.fdi, 2) + ").");
        if (k > 1) avisos.push("São necessários " + k + " inversores iguais para atender ao arranjo.");
        return {
          inversor: inv,
          compativel: true,
          quantidade: k,
          pdcTotalW: pdcTotal,
          pdcPorInversorW: gMaior.pdc,
          fdi: gMaior.fdi,
          arranjo: gMaior.arranjo,
          motivos: [],
          avisos: avisos,
          custo: k * inv.preco,
        };
      }
    }
    return {
      inversor: inv,
      compativel: false,
      motivos: primeiraFalha ? primeiraFalha.motivos : ["Arranjo incompatível."],
      avisos: avisos,
      pdcTotalW: qtdModulos * mod.potenciaWp,
    };
  }

  // Ordena os compatíveis por adequação técnica e só depois preço (PB07-T04).
  function rankearInversores(inversores, mod, qtdModulos, comBateria) {
    const avaliados = inversores.map(function (inv) {
      return avaliarInversor(inv, mod, qtdModulos, comBateria);
    });
    const ok = avaliados.filter(function (a) {
      return a.compativel;
    });
    if (ok.length) {
      const custos = ok.map(function (a) {
        return a.custo;
      });
      const minC = Math.min.apply(null, custos);
      const maxC = Math.max.apply(null, custos);
      ok.forEach(function (a) {
        const desvioFDI = Math.min(1, Math.abs(a.fdi - CONST.FDI_IDEAL) / CONST.FDI_IDEAL);
        const penalMppt = a.quantidade > 1 ? 0.15 : 0; // prefere 1 inversor
        const normPreco = maxC > minC ? (a.custo - minC) / (maxC - minC) : 0;
        // 60% adequação técnica, 40% preço: nunca só o menor preço.
        a.score = 0.6 * (desvioFDI + penalMppt) + 0.4 * normPreco;
      });
      ok.sort(function (a, b) {
        return a.score - b.score;
      });
      ok[0].recomendado = true;
    }
    const nok = avaliados.filter(function (a) {
      return !a.compativel;
    });
    return ok.concat(nok);
  }

  // ---------- Baterias (PB10/PB11/PB12/PB26) ----------
  function dimensionarBateria(bat, p) {
    // p: { diarioKwh, autonomiaH, eficiencia }
    const energiaNecessaria = (p.diarioKwh / 24) * p.autonomiaH; // kWh úteis
    const dod = bat.dod / 100;
    const capNominalNecessaria = energiaNecessaria / (dod * p.eficiencia);
    const qtd = Math.max(1, Math.ceil(capNominalNecessaria / bat.capacidadeKwh - 1e-9));
    return {
      bateria: bat,
      autonomiaH: p.autonomiaH,
      energiaNecessariaKwh: energiaNecessaria,
      dodUtilizado: bat.dod,
      eficienciaUtilizada: p.eficiencia,
      capacidadeNominalCalculadaKwh: capNominalNecessaria,
      quantidade: qtd,
      capacidadeInstaladaKwh: qtd * bat.capacidadeKwh,
      capacidadeUtilInstaladaKwh: qtd * bat.capacidadeKwh * dod * p.eficiencia,
      potenciaDescargaKw: (qtd * bat.tensaoNominal * bat.correnteMaxDescarga) / 1000,
      custo: qtd * bat.preco,
    };
  }

  // ---------- Geração e atendimento (PB08/PB09) ----------
  function calcularGeracao(potInstKwp, hsp, pr, consumoMensal, disponibilidadeKwh) {
    const diaria = potInstKwp * hsp * pr; // usa a potência efetivamente instalada
    const mensal = diaria * CONST.DIAS_MES;
    const efetivamenteConsumida = Math.min(mensal, consumoMensal);
    const excedente = Math.max(0, mensal - consumoMensal);
    // Parte da fatura que pode ser abatida (descontada a taxa mínima de disponibilidade).
    const faturavel = Math.max(0, consumoMensal - disponibilidadeKwh);
    const compensada = Math.min(mensal, faturavel);
    return {
      geracaoDiariaKwh: diaria,
      geracaoMensalKwh: mensal,
      geracaoAnualKwh: mensal * CONST.MESES_ANO,
      consumoMensalKwh: consumoMensal,
      energiaConsumidaKwh: efetivamenteConsumida,
      excedenteKwh: excedente,
      compensadaKwh: compensada,
      disponibilidadeKwh: disponibilidadeKwh,
      atendimentoPct: consumoMensal > 0 ? (efetivamenteConsumida / consumoMensal) * 100 : 0,
    };
  }

  // ---------- Orçamento (PB13/PB28) ----------
  function montarOrcamento(itens, outrosPct) {
    const linhas = itens.map(function (i) {
      return Object.assign({}, i, { subtotal: arred(i.quantidade * i.precoUnitario, 2) });
    });
    const equip = linhas.reduce(function (s, l) {
      return s + l.subtotal;
    }, 0);
    const outros = isFinite(outrosPct) && outrosPct > 0 ? arred(equip * (outrosPct / 100), 2) : 0;
    if (outros > 0) {
      linhas.push({
        tipo: "Outros",
        descricao: "Outros custos (instalação, estrutura, cabeamento, proteções) - " + fmt(outrosPct, 1) + "% dos equipamentos",
        fabricanteModelo: "—",
        quantidade: 1,
        precoUnitario: outros,
        subtotal: outros,
        fonte: "Premissa informada pelo usuário",
      });
    }
    return { linhas: linhas, equipamentos: arred(equip, 2), outros: outros, total: arred(equip + outros, 2) };
  }

  // ---------- Economia e payback (PB15/PB16) ----------
  function calcularEconomia(geracao, tarifa) {
    const mensal = geracao.compensadaKwh * tarifa;
    return {
      tarifa: tarifa,
      energiaCompensadaKwh: geracao.compensadaKwh,
      economiaMensal: mensal,
      economiaAnual: mensal * CONST.MESES_ANO,
    };
  }
  function calcularPayback(investimento, economiaAnual) {
    if (!(economiaAnual > 0) || !(investimento > 0)) {
      return { calculavel: false, anos: null, meses: null };
    }
    const anos = investimento / economiaAnual;
    return { calculavel: true, anos: anos, meses: Math.round(anos * 12) };
  }

  // ---------- Cenário completo (com ou sem bateria) ----------
  // entrada: { consumo, hsp, pr, pct, tarifa, disponibilidadeKwh, outrosPct,
  //            moduloId, inversorId, bateriaId, autonomiaH, eficienciaBateria }
  function calcularCenario(entrada, dados, comBateria) {
    const erros = validarParametros(entrada);
    if (!entrada.moduloId) erros.push("Selecione um módulo fotovoltaico.");
    const modulo = dados.modulos.find(function (m) {
      return String(m.id) === String(entrada.moduloId);
    });
    if (entrada.moduloId && !modulo) erros.push("O módulo selecionado não existe no dataset.");

    if (comBateria) {
      if (!isFinite(entrada.autonomiaH) || entrada.autonomiaH <= 0) {
        erros.push("Informe uma autonomia em horas maior que zero.");
      } else if (entrada.autonomiaH > 240) {
        erros.push("A autonomia informada é irreal (máximo aceito: 240 horas).");
      }
      if (!isFinite(entrada.eficienciaBateria) || entrada.eficienciaBateria <= 0 || entrada.eficienciaBateria > 1) {
        erros.push("A eficiência da bateria deve estar entre 0 e 1.");
      }
    }
    if (erros.length) return { ok: false, comBateria: comBateria, erros: erros, avisos: [] };

    const avisos = [];
    const potencia = potenciaNecessaria(entrada.consumo.diarioKwh, entrada.hsp, entrada.pr, entrada.pct);
    const mods = dimensionarModulos(modulo, potencia.wp);

    // inversor
    const ranking = rankearInversores(dados.inversores, modulo, mods.quantidade, comBateria);
    const compat = ranking.filter(function (r) {
      return r.compativel;
    });
    if (!compat.length) {
      return {
        ok: false,
        comBateria: comBateria,
        erros: [
          "Nenhum inversor do dataset é compatível com " + mods.quantidade + " módulo(s) " + modulo.fabricante + " " + modulo.modelo +
            (comBateria ? " com armazenamento" : "") + ". Escolha outro módulo.",
        ],
        avisos: [],
        potencia: potencia,
        modulos: mods,
        rankingInversores: ranking,
      };
    }
    let inv = compat.find(function (c) {
      return entrada.inversorId && String(c.inversor.id) === String(entrada.inversorId);
    });
    if (!inv) {
      inv = compat[0];
      if (entrada.inversorId) avisos.push("O inversor escolhido não é compatível neste cenário; foi usado o recomendado.");
    }
    inv.escolhido = true;

    // bateria
    let bat = null;
    if (comBateria) {
      const opcoes = dados.baterias.map(function (b) {
        return dimensionarBateria(b, {
          diarioKwh: entrada.consumo.diarioKwh,
          autonomiaH: entrada.autonomiaH,
          eficiencia: entrada.eficienciaBateria,
        });
      });
      opcoes.sort(function (a, b) {
        return a.custo - b.custo;
      });
      if (opcoes.length) opcoes[0].recomendada = true;
      bat = opcoes.find(function (o) {
        return entrada.bateriaId && String(o.bateria.id) === String(entrada.bateriaId);
      });
      if (!bat) bat = opcoes[0];
      if (!bat) {
        return { ok: false, comBateria: true, erros: ["Dataset de baterias vazio."], avisos: [] };
      }
      if (bat.potenciaDescargaKw * 1000 < inv.inversor.potenciaNominal * inv.quantidade * 0.5) {
        avisos.push(
          "A potência de descarga das baterias (" + fmt(bat.potenciaDescargaKw, 1) + " kW) é inferior à metade da potência do inversor: a carga atendida na falta de rede será limitada.",
        );
      }
      avisos.push("O dataset não informa a faixa de tensão de bateria dos inversores: confirme a compatibilidade com baterias de " + bat.bateria.tensaoNominal + " V no datasheet.");
    }
    inv.avisos.forEach(function (a) {
      avisos.push(a);
    });

    const ger = calcularGeracao(mods.potenciaInstaladaKwp, entrada.hsp, entrada.pr, entrada.consumo.mensalKwh, entrada.disponibilidadeKwh || 0);

    const itens = [
      {
        tipo: "Módulo FV",
        descricao: "Módulo fotovoltaico " + fmt(modulo.potenciaWp, 0) + " Wp",
        fabricanteModelo: modulo.fabricante + " " + modulo.modelo,
        quantidade: mods.quantidade,
        precoUnitario: modulo.preco,
        fonte: modulo.fornecedor + " (" + modulo.dataColeta + ")",
      },
      {
        tipo: "Inversor",
        descricao: "Inversor " + inv.inversor.tipo + " " + fmt(inv.inversor.potenciaNominal, 0) + " W",
        fabricanteModelo: inv.inversor.fabricante + " " + inv.inversor.modelo,
        quantidade: inv.quantidade,
        precoUnitario: inv.inversor.preco,
        fonte: inv.inversor.fornecedor + " (" + inv.inversor.dataColeta + ")",
      },
    ];
    if (bat) {
      itens.push({
        tipo: "Bateria",
        descricao: "Bateria " + bat.bateria.tecnologia + " " + fmt(bat.bateria.capacidadeKwh, 2) + " kWh",
        fabricanteModelo: bat.bateria.fabricante + " " + bat.bateria.modelo,
        quantidade: bat.quantidade,
        precoUnitario: bat.bateria.preco,
        fonte: bat.bateria.fornecedor + " (" + bat.bateria.dataColeta + ")",
      });
    }
    const orc = montarOrcamento(itens, entrada.outrosPct);
    const eco = calcularEconomia(ger, entrada.tarifa);
    const pb = calcularPayback(orc.total, eco.economiaAnual);
    if (!pb.calculavel) {
      avisos.push("Payback não calculado: a economia estimada é zero (verifique consumo, tarifa e taxa de disponibilidade).");
    }
    if (ger.excedenteKwh > 0) {
      avisos.push(
        "A geração estimada supera o consumo em " + fmt(ger.excedenteKwh, 1) + " kWh/mês; o excedente vira crédito de energia e não reduz a fatura abaixo do mínimo.",
      );
    }

    return {
      ok: true,
      comBateria: comBateria,
      erros: [],
      avisos: avisos,
      potencia: potencia,
      modulos: mods,
      inversor: inv,
      rankingInversores: ranking,
      bateria: bat,
      geracao: ger,
      orcamento: orc,
      economia: eco,
      payback: pb,
    };
  }

  const api = {
    CONST: CONST,
    num: num,
    arred: arred,
    brl: brl,
    fmt: fmt,
    esc: esc,
    normalizarTexto: normalizarTexto,
    parseCSV: parseCSV,
    montarDatasets: montarDatasets,
    buscarHSP: buscarHSP,
    consumoReferencia: consumoReferencia,
    validarParametros: validarParametros,
    potenciaNecessaria: potenciaNecessaria,
    dimensionarModulos: dimensionarModulos,
    avaliarInversor: avaliarInversor,
    rankearInversores: rankearInversores,
    dimensionarBateria: dimensionarBateria,
    calcularGeracao: calcularGeracao,
    montarOrcamento: montarOrcamento,
    calcularEconomia: calcularEconomia,
    calcularPayback: calcularPayback,
    calcularCenario: calcularCenario,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Solar = api;
})(typeof window !== "undefined" ? window : globalThis);
