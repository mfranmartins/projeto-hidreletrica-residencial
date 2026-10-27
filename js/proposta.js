// ==========================================================
// proposta.js - Proposta preliminar fotovoltaica (PB17/PB21/PB29)
// Lê o dimensionamento SALVO (não recalcula), mantendo a proposta estável.
// ==========================================================
(function () {
  "use strict";
  const S = window.Solar;
  const h = S.esc;
  const $ = function (id) {
    return document.getElementById(id);
  };
  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }
  $("btnImprimir").addEventListener("click", function () {
    window.print();
  });

  const params = new URLSearchParams(window.location.search);
  let lista = DimStorage.doUsuario(usuario.id).sort(function (a, b) {
    return String(b.criadoEm).localeCompare(String(a.criadoEm));
  });
  if (!lista.length) {
    $("proposta").innerHTML =
      '<div class="msg-aviso">Nenhum dimensionamento salvo. <a href="dimensionamento.html">Realize um dimensionamento</a> e salve-o para gerar a proposta.</div>';
    $("selProposta").hidden = true;
    return;
  }
  const idUrl = params.get("id");
  let atual = lista.find(function (d) {
    return String(d.id) === String(idUrl);
  });
  if (!atual) {
    const sel = localStorage.getItem("imovelSelecionado");
    atual =
      lista.find(function (d) {
        return String(d.imovelId) === String(sel);
      }) || lista[0];
  }
  $("selProposta").innerHTML = lista
    .map(function (d) {
      return '<option value="' + h(d.id) + '">' + h(d.imovel.identificacao) + " — " + new Date(d.criadoEm).toLocaleString("pt-BR") + "</option>";
    })
    .join("");
  $("selProposta").value = atual.id;
  $("selProposta").addEventListener("change", function () {
    window.location.search = "?id=" + encodeURIComponent(this.value);
  });

  function metrica(rotulo, valor) {
    return '<div class="metrica"><small>' + rotulo + "</small><strong>" + valor + "</strong></div>";
  }
  function tabela(cab, linhas) {
    return (
      '<div class="tabela-wrap"><table class="tabela"><thead><tr>' +
      cab.map(function (c) { return "<th>" + c + "</th>"; }).join("") +
      "</tr></thead><tbody>" + linhas.join("") + "</tbody></table></div>"
    );
  }
  function linkFonte(i) {
    const url = /^https?:\/\//i.test(i.urlFonte || "") ? i.urlFonte : "";
    const t = h(i.fornecedor || "fonte") + (i.dataColeta ? " (" + h(i.dataColeta) + ")" : "");
    return url ? '<a href="' + h(url) + '" target="_blank" rel="noopener">' + t + "</a>" : t;
  }

  const d = atual;
  const en = d.entrada;
  const r = d.cenarios[d.cenarioSelecionado];
  const outroNome = d.cenarioSelecionado === "com" ? "sem" : "com";
  const outro = d.cenarios[outroNome];
  const comBat = d.cenarioSelecionado === "com";
  const c = en.consumo;

  if (!r || !r.ok) {
    $("proposta").innerHTML = '<div class="msg-erro">O dimensionamento salvo não possui um cenário válido.</div>';
    return;
  }
  const g = r.geracao,
    o = r.orcamento,
    e = r.economia,
    pb = r.payback,
    inv = r.inversor,
    a = inv.arranjo;

  let html = "";
  html += "<h1>Proposta Preliminar de Sistema Fotovoltaico</h1>";
  html += '<p class="nota">Emitida em ' + new Date(d.criadoEm).toLocaleString("pt-BR") + " · Cenário: <strong>" +
    (comBat ? "com baterias" : "sem baterias (on-grid)") + "</strong> · Documento de caráter preliminar.</p>";

  html += '<section class="passo"><h2>Residência</h2><p><strong>' + h(d.imovel.identificacao) + "</strong> — " + h(d.imovel.endereco) +
    " (" + h(d.imovel.tipo) + ")</p></section>";

  html += '<section class="passo"><h2>Consumo e dados solares</h2><div class="metricas">' +
    metrica("Consumo médio mensal", S.fmt(c.mensalKwh) + " kWh/mês") +
    metrica("Consumo médio diário", S.fmt(c.diarioKwh) + " kWh/dia") +
    metrica("Potência instalada (aparelhos)", c.potenciaInstaladaKw === null || c.potenciaInstaladaKw === undefined ? "n/d" : S.fmt(c.potenciaInstaladaKw) + " kW") +
    metrica("HSP", S.fmt(en.hsp, 2) + " h/dia") +
    metrica("PR", S.fmt(en.pr, 2)) +
    metrica("Atendimento desejado", S.fmt(en.pct, 0) + " %") +
    "</div><p class=\"nota\">Base do consumo: " + h(c.fonte) + ". Fonte da HSP: " + h(en.hspFonte || "informada pelo usuário") +
    ". Justificativa do PR: " + h(en.prJustificativa || "") + "</p></section>";

  html += '<section class="passo"><h2>Sistema dimensionado</h2><div class="metricas">' +
    metrica("Potência necessária", S.fmt(r.potencia.kWp, 2) + " kWp") +
    metrica("Potência instalada", S.fmt(r.modulos.potenciaInstaladaKwp, 2) + " kWp") +
    metrica("Módulos", r.modulos.quantidade + " × " + S.fmt(r.modulos.potenciaIndividualWp, 0) + " Wp") +
    metrica("Inversor", inv.quantidade + " × " + h(inv.inversor.fabricante + " " + inv.inversor.modelo)) +
    "</div>" +
    '<p class="nota">Módulo: ' + h(r.modulos.modulo.fabricante + " " + r.modulos.modulo.modelo) + " (" + S.fmt(r.modulos.modulo.eficiencia, 2) + " % de eficiência). " +
    "Inversor " + h(inv.inversor.tipo) + " de " + S.fmt(inv.inversor.potenciaNominal, 0) + " W, " + inv.inversor.numeroMPPT + " MPPT. " +
    "Arranjo: " + a.strings + " string(s) × " + a.modulosPorString + " módulos; relação FV/inversor " + S.fmt(inv.fdi, 2) +
    "; Voc corrigida " + S.fmt(a.vocCorrigida, 0) + " V; Vmp " + S.fmt(a.vmpString, 0) + " V; Isc " + S.fmt(a.iscString, 1) + " A. " +
    "Verificações de potência, tensão, faixa MPPT e corrente atendidas.</p></section>";

  html += '<section class="passo"><h2>Geração e atendimento</h2><div class="metricas">' +
    metrica("Geração diária", S.fmt(g.geracaoDiariaKwh) + " kWh/dia") +
    metrica("Geração mensal", S.fmt(g.geracaoMensalKwh) + " kWh/mês") +
    metrica("Consumo mensal", S.fmt(g.consumoMensalKwh) + " kWh/mês") +
    metrica("Atendimento do consumo", S.fmt(g.atendimentoPct, 1) + " %") +
    metrica("Excedente (crédito)", S.fmt(g.excedenteKwh) + " kWh/mês") +
    "</div></section>";

  if (r.bateria) {
    const b = r.bateria;
    html += '<section class="passo"><h2>Armazenamento</h2><div class="metricas">' +
      metrica("Autonomia", S.fmt(b.autonomiaH, 1) + " h") +
      metrica("Energia necessária", S.fmt(b.energiaNecessariaKwh) + " kWh") +
      metrica("Capacidade nominal calculada", S.fmt(b.capacidadeNominalCalculadaKwh) + " kWh") +
      metrica("Baterias", b.quantidade + " × " + h(b.bateria.fabricante + " " + b.bateria.modelo)) +
      metrica("Capacidade instalada", S.fmt(b.capacidadeInstaladaKwh) + " kWh") +
      "</div><p class=\"nota\">DoD utilizado: " + S.fmt(b.dodUtilizado, 0) + " % · eficiência: " + S.fmt(b.eficienciaUtilizada, 2) +
      " · tecnologia " + h(b.bateria.tecnologia) + ".</p></section>";
  }

  html += '<section class="passo"><h2>Orçamento</h2>' +
    tabela(["Equipamento", "Fabricante / modelo", "Qtd.", "Preço unitário", "Subtotal", "Fonte do preço"],
      o.linhas.map(function (l) {
        return "<tr><td>" + h(l.descricao) + "</td><td>" + h(l.fabricanteModelo) + '</td><td class="num">' + l.quantidade +
          '</td><td class="num">' + S.brl(l.precoUnitario) + '</td><td class="num">' + S.brl(l.subtotal) + "</td><td>" + h(l.fonte) + "</td></tr>";
      }).concat(['<tr><th colspan="4">Total</th><th class="num">' + S.brl(o.total) + "</th><th></th></tr>"])) +
    "</section>";

  html += '<section class="passo"><h2>Economia e payback</h2><div class="metricas">' +
    metrica("Tarifa utilizada", S.brl(e.tarifa) + "/kWh") +
    metrica("Energia compensada", S.fmt(e.energiaCompensadaKwh) + " kWh/mês") +
    metrica("Economia mensal", S.brl(e.economiaMensal)) +
    metrica("Economia anual", S.brl(e.economiaAnual)) +
    metrica("Payback simples", pb.calculavel ? "≈ " + S.fmt(pb.anos, 1) + " anos (" + pb.meses + " meses)" : "não calculável") +
    "</div></section>";

  if (outro && outro.ok) {
    html += '<section class="passo"><h2>Comparativo com o cenário ' + (outroNome === "com" ? "com baterias" : "sem baterias") + "</h2>" +
      tabela(["Item", comBat ? "Com baterias (proposta)" : "Sem baterias (proposta)", outroNome === "com" ? "Com baterias" : "Sem baterias"], [
        ["Investimento total", S.brl(r.orcamento.total), S.brl(outro.orcamento.total)],
        ["Armazenamento", r.bateria ? S.fmt(r.bateria.capacidadeInstaladaKwh) + " kWh" : "—", outro.bateria ? S.fmt(outro.bateria.capacidadeInstaladaKwh) + " kWh" : "—"],
        ["Inversor", h(inv.inversor.modelo), h(outro.inversor.inversor.modelo)],
        ["Economia anual", S.brl(e.economiaAnual), S.brl(outro.economia.economiaAnual)],
        ["Payback simples", pb.calculavel ? S.fmt(pb.anos, 1) + " anos" : "—", outro.payback.calculavel ? S.fmt(outro.payback.anos, 1) + " anos" : "—"],
      ].map(function (l) {
        return "<tr><th>" + l[0] + "</th><td>" + l[1] + "</td><td>" + l[2] + "</td></tr>";
      })) + "</section>";
  }

  html += '<section class="passo"><h2>Premissas e observações</h2><ul>' +
    "<li>Energia compensada = menor valor entre a geração e (consumo − taxa mínima de " + g.disponibilidadeKwh + " kWh/mês da ligação " + h(en.ligacao) + ").</li>" +
    "<li>Payback simples = investimento ÷ economia anual. <strong>É uma estimativa, não uma previsão financeira exata</strong>: não considera reajuste de tarifa, degradação dos módulos, manutenção, financiamento, troca de inversor/baterias nem regras tarifárias específicas (ex.: TUSD Fio B).</li>" +
    "<li>Orçamento: " + (en.outrosPct > 0 ? "inclui " + S.fmt(en.outrosPct, 1) + " % de outros custos informados pelo usuário" : "considera apenas equipamentos (sem instalação, estrutura, cabeamento e proteções)") + ".</li>" +
    "<li>Preços e especificações vêm dos datasets do sistema, com fornecedor e data de coleta indicados; confirme disponibilidade e valores antes da contratação.</li>" +
    (r.avisos || []).map(function (x) { return "<li>" + h(x) + "</li>"; }).join("") +
    "</ul><p class=\"nota\">Fontes dos equipamentos: módulos — " + linkFonte(r.modulos.modulo) + "; inversor — " + linkFonte(inv.inversor) +
    (r.bateria ? "; baterias — " + linkFonte(r.bateria.bateria) : "") + ".</p></section>";

  $("proposta").innerHTML = html;
})();
