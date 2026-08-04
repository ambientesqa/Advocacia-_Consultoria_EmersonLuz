// Carrega dados do localStorage ou do arquivo dados.js
let db = JSON.parse(localStorage.getItem('advocacia_db')) || dadosIniciais;

const form = document.getElementById('client-form');
const tableBody = document.getElementById('table-body');
const recordIdInput = document.getElementById('record-id');
const formTitle = document.getElementById('form-title');
const btnCancel = document.getElementById('btn-cancel');
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const parcelasPreview = document.getElementById('parcelas-preview');

// Array temporário que armazena as parcelas do formulário atual
let parcelasCalculadas = [];

// Função para calcular o status de pagamento automaticamente
function gerarStatusAutomatico(entradaPaga, parcelas) {
    const pendentes = (parcelas || []).filter(p => !p.paga);
    
    // Formata o texto das parcelas abertas ex: "2ª Parcela (02/09/2026)"
    const textoParcelasAbertas = pendentes.map(p => {
        const partes = p.texto.split(': ');
        const num = partes[0] || `${p.numero}ª Parcela`;
        const data = partes[1] || '';
        return `${num} (${data})`;
    }).join(', ');

    if (!entradaPaga && pendentes.length > 0) {
        return `Aguardando Pagamento da Entrada + Parcelas em aberto: ${textoParcelasAbertas}`;
    } else if (!entradaPaga && pendentes.length === 0) {
        return `Aguardando Pagamento da Entrada`;
    } else if (entradaPaga && pendentes.length > 0) {
        return `Aguardando pagamento das parcelas: ${textoParcelasAbertas}`;
    } else {
        return `Todos os pagamentos em dia`;
    }
}

// Atualiza o campo visual do status no formulário
function atualizarCampoStatusForm() {
    const entradaPaga = document.getElementById('entradaPaga').value === 'true';
    const statusAuto = gerarStatusAutomatico(entradaPaga, parcelasCalculadas);
    document.getElementById('status').value = statusAuto;
}

// Evento de mudança na seleção do status da entrada
document.getElementById('entradaPaga').addEventListener('change', atualizarCampoStatusForm);

// Função para calcular automaticamente o cronograma de parcelas
function calcularParcelas() {
    const dataInicialStr = document.getElementById('vencimento').value;
    const tipoParcela = document.getElementById('tipoParcela').value;
    const totalParcelas = parseInt(document.getElementById('totalParcelas').value) || 0;

    const antigasParcelas = [...parcelasCalculadas];
    parcelasCalculadas = [];

    if (!dataInicialStr || totalParcelas <= 0) {
        parcelasPreview.innerHTML = '<em>Preencha o Vencimento e o Total de Parcelas para calcular as datas.</em>';
        atualizarCampoStatusForm();
        return;
    }

    const [year, month, day] = dataInicialStr.split('-').map(Number);
    let htmlList = '<ul>';

    for (let i = 0; i < totalParcelas; i++) {
        const mesesAdicionais = tipoParcela === 'fixa' ? i : i * 2;
        const dataParcela = new Date(year, month - 1 + mesesAdicionais, day);
        
        if (dataParcela.getDate() !== day) {
            dataParcela.setDate(0); 
        }

        const dataFormatada = dataParcela.toLocaleDateString('pt-BR');
        const itemText = `${i + 1}ª Parcela: ${dataFormatada}`;
        
        // Mantém o status de pagamento anterior se o número da parcela for o mesmo
        const jaPaga = antigasParcelas[i] ? antigasParcelas[i].paga : false;

        const parcelaObj = {
            numero: i + 1,
            texto: itemText,
            paga: jaPaga
        };

        parcelasCalculadas.push(parcelaObj);

        const statusClass = jaPaga ? 'status-pago' : 'status-pendente';
        const statusText = jaPaga ? 'Pago' : 'Pendente';

        htmlList += `
            <li>
                <span>${itemText}</span>
                <button type="button" class="status-btn ${statusClass}" onclick="toggleStatusPreview(${i})">${statusText}</button>
            </li>
        `;
    }

    htmlList += '</ul>';
    parcelasPreview.innerHTML = htmlList;
    atualizarCampoStatusForm();
}

// Alternar status pago/pendente no formulário (Preview)
function toggleStatusPreview(index) {
    if (parcelasCalculadas[index]) {
        parcelasCalculadas[index].paga = !parcelasCalculadas[index].paga;
        calcularParcelas();
    }
}

// Alternar pagamento da Entrada direto na tabela com 1 clique
function toggleEntradaStatus(id) {
    const item = db.find(r => r.id === id);
    if (item) {
        item.entradaPaga = !item.entradaPaga;
        item.status = gerarStatusAutomatico(item.entradaPaga, item.parcelasGeradas);
        renderTable();
    }
}

// Alternar pagamento de uma Parcela específica direto na tabela com 1 clique
function toggleParcelaStatus(recordId, indexParcela) {
    const item = db.find(r => r.id === recordId);
    if (item && item.parcelasGeradas && item.parcelasGeradas[indexParcela]) {
        item.parcelasGeradas[indexParcela].paga = !item.parcelasGeradas[indexParcela].paga;
        item.status = gerarStatusAutomatico(item.entradaPaga, item.parcelasGeradas);
        renderTable();
    }
}

// Formata data YYYY-MM-DD para DD/MM/YYYY na tabela
function formatarDataBR(dataIso) {
    if (!dataIso || !dataIso.includes('-')) return dataIso;
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Renderiza os registros na tabela
function renderTable(dataToRender = db) {
    tableBody.innerHTML = '';
    
    if (dataToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #888;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dataToRender.forEach(item => {
        const tr = document.createElement('tr');
        
        const badgeClass = item.tipoParcela === 'intercalada' ? 'badge badge-intercalada' : 'badge';
        const tipoLabel = item.tipoParcela === 'intercalada' ? 'Intercalada' : 'Fixa';

        // Entrada
        const entradaBtnClass = item.entradaPaga ? 'status-pago' : 'status-pendente';
        const entradaBtnText = item.entradaPaga ? 'Pago' : 'Pendente';
        const valorEntradaText = item.valorEntrada ? item.valorEntrada : 'R$ 0,00';
        
        const entradaHtml = `
            <div><strong>${valorEntradaText}</strong></div>
            <button class="status-btn ${entradaBtnClass}" onclick="toggleEntradaStatus(${item.id})">${entradaBtnText}</button>
        `;

        // Renderiza lista de parcelas interativas
        let listaParcelasHtml = '<em>Sem parcelas</em>';
        let pagasCount = 0;

        if (item.parcelasGeradas && item.parcelasGeradas.length > 0) {
            listaParcelasHtml = `<ul class="parcelas-list-table">`;
            item.parcelasGeradas.forEach((p, idx) => {
                if (p.paga) pagasCount++;
                const pClass = p.paga ? 'status-pago' : 'status-pendente';
                const pText = p.paga ? 'Pago' : 'Pendente';

                listaParcelasHtml += `
                    <li>
                        <span>${p.texto}</span>
                        <button class="status-btn ${pClass}" onclick="toggleParcelaStatus(${item.id}, ${idx})">${pText}</button>
                    </li>
                `;
            });
            listaParcelasHtml += `</ul>`;
        }

        const totalP = item.parcelasGeradas ? item.parcelasGeradas.length : 0;
        const statusAtual = gerarStatusAutomatico(item.entradaPaga, item.parcelasGeradas);
        const observacoesText = item.observacao ? `<br><small style="color: #aaa;"><strong>Obs:</strong> ${item.observacao}</small>` : '';

        tr.innerHTML = `
            <td><strong>${item.cliente}</strong></td>
            <td>${item.processo}</td>
            <td>${entradaHtml}</td>
            <td>
                ${formatarDataBR(item.vencimento)}<br>
                <span class="${badgeClass}">${tipoLabel} (${item.totalParcelas}x)</span>
            </td>
            <td>${listaParcelasHtml}</td>
            <td>${item.honorarios}</td>
            <td>
                <div><strong>${pagasCount} / ${totalP}</strong> parcelas pagas</div>
                <div style="font-size: 0.8rem; margin-top: 4px; color: var(--gold-hover);">${statusAtual}</div>
                ${observacoesText}
            </td>
            <td class="actions-cell">
                <button class="btn-gold" onclick="editRecord(${item.id})">Editar</button>
                <button class="btn-danger" onclick="deleteRecord(${item.id})">Excluir</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    saveToStorage();
}

// Salva localmente
function saveToStorage() {
    localStorage.setItem('advocacia_db', JSON.stringify(db));
}

// Filtro de Busca + Lista de Sugestões (Dropdown Auto-complete)
function filterRecords() {
    const query = searchInput.value.toLowerCase().trim();
    
    // Filtra para a tabela
    const filtered = db.filter(item => {
        return (
            item.cliente.toLowerCase().includes(query) ||
            item.processo.toLowerCase().includes(query) ||
            item.valor.toLowerCase().includes(query) ||
            item.vencimento.toLowerCase().includes(query) ||
            item.honorarios.toLowerCase().includes(query) ||
            (item.status && item.status.toLowerCase().includes(query)) ||
            (item.observacao && item.observacao.toLowerCase().includes(query))
        );
    });

    renderTable(filtered);

    // Se houver termo pesquisado, monta a lista suspensa
    if (query.length > 0 && filtered.length > 0) {
        searchDropdown.innerHTML = '';
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div class="search-result-info">
                    <span class="search-result-title">${item.cliente}</span>
                    <span class="search-result-sub">${item.processo}</span>
                </div>
                <span class="search-result-action">Editar ✏️</span>
            `;
            div.onclick = () => {
                editRecord(item.id);
                searchDropdown.style.display = 'none';
            };
            searchDropdown.appendChild(div);
        });
        searchDropdown.style.display = 'block';
    } else {
        searchDropdown.style.display = 'none';
    }
}

// Oculta a lista de sugestões ao clicar fora dela
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
    }
});

// Exibe a lista se o usuário clicar de volta no input com texto
searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
        filterRecords();
    }
});

// Inserção e Edição
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = recordIdInput.value;
    const entradaPaga = document.getElementById('entradaPaga').value === 'true';
    const recordData = {
        id: id ? parseInt(id) : Date.now(),
        cliente: document.getElementById('cliente').value,
        processo: document.getElementById('processo').value,
        valor: document.getElementById('valor').value,
        valorEntrada: document.getElementById('valorEntrada').value,
        entradaPaga: entradaPaga,
        vencimento: document.getElementById('vencimento').value,
        tipoParcela: document.getElementById('tipoParcela').value,
        totalParcelas: parseInt(document.getElementById('totalParcelas').value),
        honorarios: document.getElementById('honorarios').value,
        status: gerarStatusAutomatico(entradaPaga, parcelasCalculadas),
        observacao: document.getElementById('observacao').value,
        parcelasGeradas: [...parcelasCalculadas]
    };

    if (id) {
        const index = db.findIndex(item => item.id === parseInt(id));
        if (index !== -1) db[index] = recordData;
    } else {
        db.push(recordData);
    }

    resetForm();
    filterRecords();
});

// Preparar formulário para edição
function editRecord(id) {
    const item = db.find(r => r.id === id);
    if (!item) return;

    recordIdInput.value = item.id;
    document.getElementById('cliente').value = item.cliente;
    document.getElementById('processo').value = item.processo;
    document.getElementById('valor').value = item.valor;
    document.getElementById('valorEntrada').value = item.valorEntrada || '';
    document.getElementById('entradaPaga').value = item.entradaPaga ? 'true' : 'false';
    document.getElementById('vencimento').value = item.vencimento;
    document.getElementById('tipoParcela').value = item.tipoParcela || 'fixa';
    document.getElementById('totalParcelas').value = item.totalParcelas || 1;
    document.getElementById('honorarios').value = item.honorarios;
    document.getElementById('observacao').value = item.observacao || '';

    if (item.parcelasGeradas && item.parcelasGeradas.length > 0) {
        parcelasCalculadas = [...item.parcelasGeradas];
    }
    
    calcularParcelas();

    formTitle.innerText = "Atualizar Registro";
    btnCancel.style.display = "inline-block";
    form.scrollIntoView({ behavior: 'smooth' });
}

// Excluir registro
function deleteRecord(id) {
    if (confirm("Deseja realmente excluir este registro?")) {
        db = db.filter(item => item.id !== id);
        filterRecords();
    }
}

// Limpar formulário (reseta campos e restaura o formulário para modo "Inserir Novo Registro")
function resetForm() {
    form.reset();
    recordIdInput.value = '';
    parcelasCalculadas = [];
    parcelasPreview.innerHTML = '<em>Selecione o Vencimento e o Total de Parcelas para gerar o cronograma.</em>';
    document.getElementById('status').value = '';
    document.getElementById('observacao').value = '';
    formTitle.innerText = "Inserir Novo Registro";
    btnCancel.style.display = "none";
}

// Inicializa a tabela
renderTable();