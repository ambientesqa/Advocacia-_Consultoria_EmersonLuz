const dadosIniciais = [
    {
        id: 1,
        cliente: "Jose Jucelino",
        processo: "APOSENTADORIA POR TEMPO CONTRI.",
        valor: "30 % do retroativo e 04 parcelas",
        vencimento: "2026-08-02",
        tipoParcela: "fixa",
        totalParcelas: 4,
        valorEntrada: "R$ 500,00",
        entradaPaga: true,
        honorarios: "R$ 1.162,20 + 4 parcelas",
        status: "aguardando pagamento da 2ª parcela (12/08/2026)",
        parcelasGeradas: [
            { numero: 1, texto: "1ª Parcela: 02/08/2026", paga: true },
            { numero: 2, texto: "2ª Parcela: 02/09/2026", paga: false },
            { numero: 3, texto: "3ª Parcela: 02/10/2026", paga: false },
            { numero: 4, texto: "4ª Parcela: 02/11/2026", paga: false }
        ]
    },
    {
        id: 2,
        cliente: "Mariana Santana - Mislene",
        processo: "BPC LOAS DEFICIENTE",
        valor: "30% do retroativo + 4 parcelas (intercalada)",
        vencimento: "2026-09-03",
        tipoParcela: "intercalada",
        totalParcelas: 4,
        valorEntrada: "Sem entrada",
        entradaPaga: false,
        honorarios: "R$3289,50 + 4 parcelas (intercalada)",
        status: "aguardando pagamento da 4ª parcela (12/09/2026)",
        parcelasGeradas: [
            { numero: 1, texto: "1ª Parcela: 03/09/2026", paga: true },
            { numero: 2, texto: "2ª Parcela: 03/11/2026", paga: true },
            { numero: 3, texto: "3ª Parcela: 03/01/2027", paga: true },
            { numero: 4, texto: "4ª Parcela: 03/03/2027", paga: false }
        ]
    }
];