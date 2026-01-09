# 📚 Base de Conhecimento - Unique Plástica Avançada

Esta é a base de conhecimento central do Sistema de Gestão de Vendas Inteligente da Unique.

## 📁 Estrutura

```
knowledge-base/
├── procedimentos.csv       # ✅ Lista de procedimentos com preços
├── scripts.json            # ✅ Scripts de venda por etapa
├── faq.csv                 # ✅ Perguntas frequentes
├── protocolos/             # 🔜 Protocolos de tratamento (aguardando)
│   └── README.md
├── manuais/                # 🔜 Manuais por cargo (aguardando)
│   ├── manual_sdr.pdf
│   ├── manual_closer.pdf
│   └── manual_cs.pdf
└── estudos_caso/           # 🔜 Estudos de caso (aguardando)
    └── README.md
```

## ✅ Arquivos Disponíveis

### 1. procedimentos.csv
Lista completa de 102 procedimentos com:
- ID único
- Nome do procedimento
- Categoria (procedimento/pacote)
- Preço
- Preço promocional (quando aplicável)
- Descrição
- Se é destaque

### 2. scripts.json
Scripts de venda organizados por etapa:
- **Primeiro Contato**: Abordagens iniciais
- **Qualificação**: Perguntas BANT
- **Agendamento**: Scripts para agendar Unique Day
- **Quebra de Objeção**: Respostas para objeções comuns
- **Follow-up**: Cadência de 7 dias
- **Reativação**: Leads inativos
- **Pós-Venda**: Acompanhamento
- **Farmer**: Programa de indicações

### 3. faq.csv
Perguntas frequentes categorizadas:
- Consultas
- Método CPI
- Procedimentos
- Pagamento
- Segurança
- Equipe
- Localização
- Cirurgias
- Pós-Operatório

## 🔜 Aguardando Upload

### protocolos/
Arquivos JSON com protocolos de tratamento detalhados:
- Indicações
- Contraindicações
- Etapas do procedimento
- Tempo de recuperação
- Cuidados pré e pós

### manuais/
PDFs dos manuais de cada cargo:
- Manual do SDR (Prospecção)
- Manual do Closer (Fechamento)
- Manual do CS (Pós-venda)
- Manual do Farmer (Relacionamento)

### estudos_caso/
PDFs com casos de sucesso:
- Transformação completa
- Rejuvenescimento
- Correção de procedimentos anteriores

---

## 🤖 Integração com IA

Todos os arquivos desta pasta são utilizados para alimentar o Assistente Comercial da Unique. A IA consulta:

1. **Preços**: Tabela de procedimentos atualizada do banco de dados
2. **Scripts**: Sugestões de abordagem por situação
3. **FAQ**: Respostas para dúvidas comuns
4. **Protocolos**: Informações técnicas sobre procedimentos

## 📊 Última Atualização

- **procedimentos.csv**: 09/01/2026
- **scripts.json**: 09/01/2026
- **faq.csv**: 09/01/2026
