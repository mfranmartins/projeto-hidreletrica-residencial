# Sistema de Dimensionamento Energético Residencial

Sistema web para estimativa e análise do consumo de energia elétrica residencial.

> **Status:** MVP funcional em desenvolvimento

## Sobre o projeto

O sistema permite que o usuário cadastre seus imóveis, registre o histórico de consumo e informe os aparelhos presentes na residência.

A partir desses dados, a aplicação calcula o consumo médio e máximo registrado, estima o consumo dos aparelhos e fornece feedbacks relacionados à eficiência e possível obsolescência dos equipamentos.

Também é possível comparar o consumo entre diferentes imóveis do usuário.

## Desenvolvedores

* Ana Berbel - 574176
* Marcelo Martins - 573905

### Fluxo principal

```text
Usuário → Imóvel → Aparelhos → Consumo → Processamento → Resultado
```

## Tecnologias

* HTML5
* CSS3
* JavaScript

## Funcionalidades implementadas

* Cadastro e login de usuário
* Cadastro, edição e exclusão de imóveis
* Cadastro e histórico de consumo mensal
* Cálculo de consumo médio e máximo
* Identificação do mês de maior consumo
* Gráfico do histórico de consumo
* Cadastro, edição e exclusão de aparelhos
* Estimativa de consumo mensal dos aparelhos
* Classificação de eficiência energética
* Feedback sobre possível obsolescência
* Comparação de consumo entre imóveis

## Product Backlog

| ID   | Funcionalidade            | Status     
| ---- | ------------------------- | ----------
| PB01 | Cadastro de usuário       | ✅       
| PB02 | Login                     | ✅        
| PB03 | Cadastro de imóvel        | ✅         
| PB04 | Editar/excluir imóvel     | ✅         
| PB05 | Consumo mensal            | ✅         
| PB06 | Vários meses              | ✅         
| PB07 | Histórico                 | ✅         
| PB08 | Maior consumo             | ✅         
| PB09 | Consumo médio             | ✅         
| PB10 | Resumo energético         | ✅         
| PB11 | Gráfico                   | ✅         
| PB12 | Validações                | 🟡 Parcial
| PB13 | Persistência              | 🟡 MVP    
| PB14 | Privacidade               | 🟡 MVP    
| PB15 | Cadastro de aparelhos     | ✅         
| PB16 | Feedback energético       | ✅         
| PB17 | Comparação entre imóveis  | ✅         
| PB18 | Comparação entre usuários | ⏳         
| PB19 | Gamificação e metas       | ⏳      
| PB20 | Consumo de referência fotovoltaico    | ⏳ |
| PB21 | Recurso solar / HSP                    | ⏳ |
| PB22 | Percentual de atendimento              | ⏳ |
| PB23 | Dimensionamento fotovoltaico           | ⏳ |
| PB24 | Dataset e seleção de módulos           | ⏳ |
| PB25 | Dataset e seleção do inversor          | ⏳ |
| PB26 | Armazenamento por baterias             | ⏳ |
| PB27 | Compatibilidade técnica                | ⏳ |
| PB28 | Orçamento fotovoltaico                 | ⏳ |
| PB29 | Proposta preliminar                    | ⏳ |

## Estimativa de consumo

O consumo mensal estimado de cada aparelho é calculado pela fórmula:

```text
Consumo = (Potência em W / 1000)
        × Quantidade
        × Horas de uso por dia
        × 30
```

O resultado é apresentado em **kWh/mês**.

## Persistência e limitações do MVP

Nesta versão, os dados são armazenados no `localStorage` do navegador, permitindo executar o sistema diretamente pelo Live Server, sem necessidade de backend.

Essa abordagem é utilizada para validação do MVP. Em versões futuras, pretende-se implementar banco de dados, autenticação real e controle de acesso no servidor.

## Como executar

1. Clone o repositório.
2. Abra o projeto no Visual Studio Code.
3. Abra `index.html`.
4. Execute com o **Live Server**.
5. Cadastre um usuário e faça login.
6. Cadastre um imóvel e utilize as funcionalidades disponíveis.

## Andamento

O MVP possui o fluxo principal implementado, desde o cadastro do usuário e imóvel até o registro e análise do consumo energético.

As próximas etapas previstas são o aprimoramento da persistência e segurança, comparação entre usuários, gamificação e evolução da interface conforme a identidade visual do projeto.
