// Testes de regras de negócio: node tests/solar.test.js
const fs = require("fs");
const path = require("path");
const S = require("../js/solar.js");
const ler = (f) => fs.readFileSync(path.join(__dirname, "..", "datasets", f), "utf8");
const dados = S.montarDatasets({ modulos: ler("modulos.csv"), inversores: ler("inversores.csv"), baterias: ler("baterias.csv"), hsp: ler("hsp.csv") });
let falhas = 0;
function t(nome, cond, extra) { if (cond) console.log("  ok  - " + nome); else { falhas++; console.log("FALHA - " + nome, extra === undefined ? "" : extra); } }

t("datasets carregados", dados.modulos.length === 10 && dados.inversores.length === 8 && dados.baterias.length === 6 && dados.hsp.length > 20,
  [dados.modulos.length, dados.inversores.length, dados.baterias.length, dados.hsp.length]);

const consumos = [342, 356, 331, 348, 365, 359].map((c) => ({ consumo: c }));
const aparelhos = [{ potencia: 150, quantidade: 1, consumoMensal: 108 }, { potencia: 5500, quantidade: 1, consumoMensal: 82.5 }];
const ref = S.consumoReferencia(consumos, aparelhos);
t("consumo médio mensal 350.17", Math.abs(ref.mensalKwh - 350.1667) < 0.01, ref.mensalKwh);
t("potência instalada 5.65 kW", Math.abs(ref.potenciaInstaladaKw - 5.65) < 1e-9);
t("sem consumo => erro", !S.consumoReferencia([], []).ok);
t("consumo negativo ignorado", S.consumoReferencia([{ consumo: -5 }], []).ok === false);

const base = { consumo: ref, hsp: 4.5, pr: 0.75, pct: 100, tarifa: 0.95, disponibilidadeKwh: 50, outrosPct: 0, moduloId: "FV008", autonomiaH: 8, eficienciaBateria: 0.9 };
const p = S.potenciaNecessaria(ref.diarioKwh, 4.5, 0.75, 100);
t("potência necessária ~3.46 kWp", Math.abs(p.kWp - 3.4568) < 0.01, p.kWp);

const sem = S.calcularCenario(base, dados, false);
t("cenário sem bateria ok", sem.ok, sem.erros);
t("módulos arredondados p/ cima (6 x 620 = 3.72 kWp)", sem.modulos.quantidade === 6 && Math.abs(sem.modulos.potenciaInstaladaKwp - 3.72) < 1e-9, sem.modulos);
t("geração usa potência instalada", Math.abs(sem.geracao.geracaoDiariaKwh - 3.72 * 4.5 * 0.75) < 1e-9);
t("atendimento 100% quando geração>consumo", sem.geracao.atendimentoPct === 100 || sem.geracao.atendimentoPct > 99, sem.geracao.atendimentoPct);
t("inversor não híbrido permitido sem bateria", sem.ok && sem.inversor.compativel);
t("orçamento soma", Math.abs(sem.orcamento.total - (sem.modulos.custo + sem.inversor.custo)) < 0.01);
t("payback calculado", sem.payback.calculavel && sem.payback.anos > 0, sem.payback);
console.log("   inversor escolhido sem bateria:", sem.inversor.inversor.modelo, "FDI", sem.inversor.fdi.toFixed(2), "| payback", sem.payback.anos.toFixed(1), "anos");

const com = S.calcularCenario(base, dados, true);
t("cenário com bateria ok", com.ok, com.erros);
t("com bateria usa inversor híbrido", com.ok && com.inversor.inversor.compativelBateria);
t("capacidade nominal = útil/(DoD*ef)", com.ok && Math.abs(com.bateria.capacidadeNominalCalculadaKwh - (ref.diarioKwh / 24 * 8) / (com.bateria.bateria.dod / 100 * 0.9)) < 1e-9);
t("com bateria mais caro", com.ok && com.orcamento.total > sem.orcamento.total);
console.log("   bateria:", com.bateria.bateria.modelo, "x", com.bateria.quantidade, "| inversor:", com.inversor.inversor.modelo, "| total", com.orcamento.total);

// validações (PB18)
const invalidos = [
  [{ consumo: { ok: false } }, "consumo inválido"],
  [{ hsp: 0 }, "HSP = 0"], [{ hsp: -1 }, "HSP negativa"], [{ pr: 0 }, "PR 0"], [{ pr: 1.5 }, "PR > 1"],
  [{ pct: 0 }, "pct 0"], [{ tarifa: 0 }, "tarifa 0"], [{ moduloId: "" }, "módulo ausente"], [{ hsp: NaN }, "HSP vazia"],
];
invalidos.forEach(([ov, nome]) => { const r = S.calcularCenario(Object.assign({}, base, ov), dados, false); t("rejeita " + nome, !r.ok && r.erros.length > 0); });
t("rejeita autonomia 0", !S.calcularCenario(Object.assign({}, base, { autonomiaH: 0 }), dados, true).ok);
t("rejeita autonomia negativa", !S.calcularCenario(Object.assign({}, base, { autonomiaH: -3 }), dados, true).ok);

// todos os módulos: nenhum deve quebrar
dados.modulos.forEach((m) => { const r = S.calcularCenario(Object.assign({}, base, { moduloId: m.id }), dados, false); console.log("   " + m.id, r.ok ? r.modulos.quantidade + " mód -> " + r.inversor.inversor.modelo + " x" + r.inversor.quantidade : "INCOMPATÍVEL: " + r.erros[0]); });

// consumo grande => vários inversores ou incompatível, sem exceção
const grande = S.calcularCenario(Object.assign({}, base, { consumo: Object.assign({}, ref, { diarioKwh: 60, mensalKwh: 1800 }) }), dados, false);
t("consumo grande não quebra", typeof grande.ok === "boolean");
console.log("   consumo 1800 kWh:", grande.ok ? grande.modulos.quantidade + " mód, inversores x" + grande.inversor.quantidade : grande.erros[0]);

// payback com economia zero
const zero = S.calcularPayback(10000, 0); t("payback sem economia não divide por zero", !zero.calculavel);
const ec = S.calcularGeracao(1, 5, 0.8, 30, 50); t("consumo ≤ disponibilidade => compensada 0", ec.compensadaKwh === 0);
console.log(falhas ? "\n" + falhas + " FALHA(S)" : "\nTodos os testes passaram"); process.exit(falhas ? 1 : 0);
