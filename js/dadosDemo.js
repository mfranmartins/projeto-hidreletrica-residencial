const dadosDemo = {
    usuario: {
        id: "demo-001",
        nome: "Usuário Demo",
        email: "demo@exemplo.com",
        senha: "demo123"
    },

    imovel: {
        id: "imovel-demo-001",
        usuarioId: "demo-001",
        identificacao: "Residência Demo",
        endereco: "São Paulo - SP",
        tipo: "Residencial",
        demonstracao: true
    },

    consumos: [
        {
            id: "consumo-demo-001",
            imovelId: "imovel-demo-001",
            mes: 1,
            ano: 2026,
            consumo: 342
        },
        {
            id: "consumo-demo-002",
            imovelId: "imovel-demo-001",
            mes: 2,
            ano: 2026,
            consumo: 356
        },
        {
            id: "consumo-demo-003",
            imovelId: "imovel-demo-001",
            mes: 3,
            ano: 2026,
            consumo: 331
        },
        {
            id: "consumo-demo-004",
            imovelId: "imovel-demo-001",
            mes: 4,
            ano: 2026,
            consumo: 348
        },
        {
            id: "consumo-demo-005",
            imovelId: "imovel-demo-001",
            mes: 5,
            ano: 2026,
            consumo: 365
        },
        {
            id: "consumo-demo-006",
            imovelId: "imovel-demo-001",
            mes: 6,
            ano: 2026,
            consumo: 359
        }
    ],

    aparelhos: [
        {
            id: "aparelho-demo-001",
            imovelId: "imovel-demo-001",
            nome: "Geladeira",
            categoria: "Cozinha",
            potencia: 150,
            quantidade: 1,
            horasUso: 24,
            marca: "Consul",
            modelo: "CRM39",
            anoFabricacao: 2023,
            tensao: 127,
            eficiencia: "A",
            consumoMensal: 108
        },
        {
            id: "aparelho-demo-002",
            imovelId: "imovel-demo-001",
            nome: "Chuveiro elétrico",
            categoria: "Banheiro",
            potencia: 5500,
            quantidade: 1,
            horasUso: 0.5,
            marca: "Lorenzetti",
            modelo: "Acqua Duo",
            anoFabricacao: 2024,
            tensao: 220,
            eficiencia: "A",
            consumoMensal: 82.5
        },
        {
            id: "aparelho-demo-003",
            imovelId: "imovel-demo-001",
            nome: "Televisão",
            categoria: "Eletrônicos",
            potencia: 120,
            quantidade: 1,
            horasUso: 5,
            marca: "Samsung",
            modelo: "Smart TV",
            anoFabricacao: 2023,
            tensao: 127,
            eficiencia: "A",
            consumoMensal: 18
        },
        {
            id: "aparelho-demo-004",
            imovelId: "imovel-demo-001",
            nome: "Ar-condicionado",
            categoria: "Climatização",
            potencia: 1200,
            quantidade: 1,
            horasUso: 4,
            marca: "LG",
            modelo: "Dual Inverter",
            anoFabricacao: 2024,
            tensao: 220,
            eficiencia: "A",
            consumoMensal: 144
        },
        {
            id: "aparelho-demo-005",
            imovelId: "imovel-demo-001",
            nome: "Máquina de lavar",
            categoria: "Lavanderia",
            potencia: 500,
            quantidade: 1,
            horasUso: 0.7,
            marca: "Brastemp",
            modelo: "BWK12",
            anoFabricacao: 2023,
            tensao: 127,
            eficiencia: "A",
            consumoMensal: 10.5
        },
        {
            id: "aparelho-demo-006",
            imovelId: "imovel-demo-001",
            nome: "Computador",
            categoria: "Eletrônicos",
            potencia: 300,
            quantidade: 1,
            horasUso: 4,
            marca: "Dell",
            modelo: "Inspiron",
            anoFabricacao: 2024,
            tensao: 127,
            eficiencia: "A",
            consumoMensal: 36
        }
    ]
};