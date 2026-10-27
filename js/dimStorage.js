// Persistência dos dimensionamentos fotovoltaicos (localStorage) - PB20
const DimStorage = {
  chave: "dimensionamentos",
  todos: function () {
    try {
      return JSON.parse(localStorage.getItem(this.chave)) || [];
    } catch (e) {
      return [];
    }
  },
  doUsuario: function (usuarioId) {
    return this.todos().filter(function (d) {
      return String(d.usuarioId) === String(usuarioId);
    });
  },
  doImovel: function (usuarioId, imovelId) {
    return this.doUsuario(usuarioId)
      .filter(function (d) {
        return String(d.imovelId) === String(imovelId);
      })
      .sort(function (a, b) {
        return String(b.criadoEm).localeCompare(String(a.criadoEm));
      });
  },
  buscar: function (id) {
    return this.todos().find(function (d) {
      return String(d.id) === String(id);
    });
  },
  salvar: function (registro) {
    const lista = this.todos();
    lista.push(registro);
    localStorage.setItem(this.chave, JSON.stringify(lista));
  },
  remover: function (id) {
    const lista = this.todos().filter(function (d) {
      return String(d.id) !== String(id);
    });
    localStorage.setItem(this.chave, JSON.stringify(lista));
  },
  removerDoImovel: function (imovelId) {
    const lista = this.todos().filter(function (d) {
      return String(d.imovelId) !== String(imovelId);
    });
    localStorage.setItem(this.chave, JSON.stringify(lista));
  },
};
