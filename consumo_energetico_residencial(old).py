# ---------------------------------------------------------
# BASE DE EQUIPAMENTOS
# ---------------------------------------------------------

equipamentos = [
    {
        "nome": "Geladeira",
        "categoria": "Eletrodoméstico",
        "potencia": 150
    },
    {
        "nome": "Televisão",
        "categoria": "Eletrônico",
        "potencia": 100
    },
    {
        "nome": "Chuveiro elétrico",
        "categoria": "Eletrodoméstico",
        "potencia": 5500
    },
    {
        "nome": "Micro-ondas",
        "categoria": "Eletrodoméstico",
        "potencia": 1400
    },
    {
        "nome": "Máquina de lavar",
        "categoria": "Eletrodoméstico",
        "potencia": 1000
    },
    {
        "nome": "Ar-condicionado",
        "categoria": "Climatização",
        "potencia": 1200
    },
    {
        "nome": "Ventilador",
        "categoria": "Climatização",
        "potencia": 100
    },
    {
        "nome": "Computador",
        "categoria": "Eletrônico",
        "potencia": 300
    },
    {
        "nome": "Lâmpada LED",
        "categoria": "Iluminação",
        "potencia": 10
    },
    {
        "nome": "Ferro de passar",
        "categoria": "Eletrodoméstico",
        "potencia": 1200
    }
]


# ---------------------------------------------------------
# FUNÇÕES
# ---------------------------------------------------------

def cadastra_imovel():

    print("\n--- CADASTRO DO IMÓVEL ---")

    rua = input("Rua: ")
    numero = input("Número: ")
    bairro = input("Bairro: ")

    imovel = {
        "rua": rua,
        "numero": numero,
        "bairro": bairro
    }

    return imovel


def exibe_equipamentos():

    print("\n--- EQUIPAMENTOS DISPONÍVEIS ---")

    for indice, equipamento in enumerate(equipamentos, start=1):

        print(
            f"{indice} - {equipamento['nome']}"
        )


def calcula_consumo(potencia, quantidade, horas_dia):

    dias_mes = 30

    consumo = (
        potencia
        * quantidade
        * horas_dia
        * dias_mes
    ) / 1000

    return consumo


def cadastra_equipamentos():

    equipamentos_imovel = []

    while True:

        exibe_equipamentos()

        opcao = int(
            input(
                "\nDigite o número do equipamento: "
            )
        )

        indice = opcao - 1

        if indice < 0 or indice >= len(equipamentos):

            print("\nEquipamento inválido.")
            continue

        equipamento = equipamentos[indice]

        quantidade = int(
            input(
                f"Quantidade de {equipamento['nome']}: "
            )
        )

        if equipamento["nome"] == "Geladeira":

            horas_dia = 24

            print(
                "Tempo de uso considerado: "
                "24 horas por dia."
            )

        else:

            horas_dia = float(
                input(
                    "Quantas horas por dia fica ligado? "
                )
            )

        consumo = calcula_consumo(
            equipamento["potencia"],
            quantidade,
            horas_dia
        )

        equipamento_imovel = {
            "nome": equipamento["nome"],
            "categoria": equipamento["categoria"],
            "potencia": equipamento["potencia"],
            "quantidade": quantidade,
            "horas_dia": horas_dia,
            "consumo_mensal": consumo
        }

        equipamentos_imovel.append(
            equipamento_imovel
        )

        print("\nO que deseja fazer?")
        print("1 - Inserir outro equipamento")
        print("2 - Seguir para o cálculo")

        escolha = input("Escolha uma opção: ")

        if escolha == "2":
            break


    return equipamentos_imovel


def exibe_resultado(imovel, equipamentos_imovel):

    print("\n========================================")
    print("      ESTIMATIVA DE CONSUMO MENSAL")
    print("========================================")

    print(
        f"\nEndereço: {imovel['rua']}, "
        f"{imovel['numero']} - "
        f"{imovel['bairro']}"
    )

    print("\n--- CONSUMO POR EQUIPAMENTO ---")

    consumo_total = 0

    for equipamento in equipamentos_imovel:

        print(
            f"\n{equipamento['nome']}"
        )

        print(
            f"Categoria: "
            f"{equipamento['categoria']}"
        )

        print(
            f"Potência: "
            f"{equipamento['potencia']} W"
        )

        print(
            f"Quantidade: "
            f"{equipamento['quantidade']}"
        )

        print(
            f"Uso diário: "
            f"{equipamento['horas_dia']:.2f} horas"
        )

        print(
            f"Consumo mensal estimado: "
            f"{equipamento['consumo_mensal']:.2f} kWh"
        )

        consumo_total += equipamento[
            "consumo_mensal"
        ]

    print("\n----------------------------------------")

    print(
        f"CONSUMO TOTAL MÉDIO MENSAL: "
        f"{consumo_total:.2f} kWh/mês"
    )

    print("----------------------------------------")


# ---------------------------------------------------------
# PROGRAMA PRINCIPAL
# ---------------------------------------------------------

def main():

    print(
        "SISTEMA DE ESTIMATIVA DE CONSUMO "
        "DE ENERGIA ELÉTRICA"
    )

    imovel = cadastra_imovel()

    equipamentos_imovel = cadastra_equipamentos()

    exibe_resultado(
        imovel,
        equipamentos_imovel
    )


main()