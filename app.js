// Variável global para armazenar os dados carregados do banco
let registros = [];

// 1. CARREGAR DADOS EM TEMPO REAL DO FIREBASE
function carregarRegistrosFirebase() {
    if (!window.db || !window.fs) {
        setTimeout(carregarRegistrosFirebase, 300);
        return;
    }

    const { collection, onSnapshot } = window.fs;
    
    // Escuta a coleção "processos" em tempo real
    onSnapshot(collection(window.db, "processos"), (snapshot) => {
        registros = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderTable();

        const reportsView = document.getElementById('reports-view');
        if (reportsView && reportsView.style.display !== 'none') {
            gerarRelatorio(false);
        }
    }, (error) => {
        console.error("Erro no Listener do Firestore:", error);
    });
}

window.addEventListener('DOMContentLoaded', carregarRegistrosFirebase);

// 2. SALVAR OU ATUALIZAR REGISTRO NO FIREBASE
document.getElementById('client-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('record-id').value;
    const { collection, addDoc, doc, updateDoc } = window.fs;

    // Coleta as parcelas
    const parcelasDOM = document.querySelectorAll('.parcela-item');
    const parcelas = Array.from(parcelasDOM).map(item => ({
        numero: parseInt(item.getAttribute('data-numero'), 10),
        vencimento: item.getAttribute('data-vencimento'),
        pago: item.getAttribute('data-pago') === 'true'
    }));

    const dadosForm = {
        cliente: document.getElementById('cliente').value,
        processo: document.getElementById('processo').value,
        valor: document.getElementById('valor').value,
        percHonorarios: document.getElementById('percHonorarios').value,
        valorEntrada: document.getElementById('valorEntrada').value,
        entradaPaga: document.getElementById('entradaPaga').value === 'true',
        vencimentoEntrada: document.getElementById('vencimentoEntrada').value,
        valorParcela: document.getElementById('valorParcela').value,
        vencimento: document.getElementById('vencimento').value,
        tipoParcela: document.getElementById('tipoParcela').value,
        totalParcelas: document.getElementById('totalParcelas').value,
        honorarios: document.getElementById('honorarios').value,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value,
        parcelas: parcelas
    };

    try {
        if (id) {
            await updateDoc(doc(window.db, "processos", id), dadosForm);
            alert("Registro atualizado com sucesso!");
        } else {
            await addDoc(collection(window.db, "processos"), dadosForm);
            alert("Registro criado com sucesso!");
        }
        resetForm();
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        alert("Erro ao gravar dados no Firebase: " + erro.message);
    }
});

// 3. ALTERAR STATUS DA PARCELA/ENTRADA DIRETO NA TABELA
async function alternarStatusParcela(idRegistro, indexParcela) {
    const reg = registros.find(r => r.id === idRegistro);
    if (!reg) return;

    const { doc, updateDoc } = window.fs;

    if (indexParcela === 'entrada') {
        reg.entradaPaga = !reg.entradaPaga;
    } else if (reg.parcelas && reg.parcelas[indexParcela]) {
        reg.parcelas[indexParcela].pago = !reg.parcelas[indexParcela].pago;
    }

    const todasParcelasPagas = reg.parcelas ? reg.parcelas.every(p => p.pago) : true;
    reg.status = (todasParcelasPagas && reg.entradaPaga) ? "Pago" : "Pendente";

    try {
        await updateDoc(doc(window.db, "processos", idRegistro), {
            entradaPaga: reg.entradaPaga,
            parcelas: reg.parcelas || [],
            status: reg.status
        });
    } catch (erro) {
        console.error("Erro ao alterar status:", erro);
        alert("Erro ao atualizar status: " + erro.message);
    }
}

// 4. EXCLUIR REGISTRO DO FIREBASE
async function deleteRecord(id) {
    if (confirm("Deseja realmente excluir este registro do banco de dados?")) {
        const { doc, deleteDoc } = window.fs;
        try {
            await deleteDoc(doc(window.db, "processos", id));
            alert("Registro excluído com sucesso!");
        } catch (erro) {
            alert("Erro ao excluir registro: " + erro.message);
        }
    }
}

// 5. CARREGAR DADOS NO FORMULÁRIO PARA EDIÇÃO
function editRecord(id) {
    const reg = registros.find(r => r.id === id);
    if (!reg) return;

    document.getElementById('record-id').value = reg.id;
    document.getElementById('cliente').value = reg.cliente || '';
    document.getElementById('processo').value = reg.processo || '';
    document.getElementById('valor').value = reg.valor || '';
    document.getElementById('percHonorarios').value = reg.percHonorarios || '';
    document.getElementById('valorEntrada').value = reg.valorEntrada || '';
    document.getElementById('entradaPaga').value = reg.entradaPaga ? 'true' : 'false';
    document.getElementById('vencimentoEntrada').value = reg.vencimentoEntrada || '';
    document.getElementById('valorParcela').value = reg.valorParcela || '';
    document.getElementById('vencimento').value = reg.vencimento || '';
    document.getElementById('tipoParcela').value = reg.tipoParcela || 'fixa';
    document.getElementById('totalParcelas').value = reg.totalParcelas || 1;
    document.getElementById('honorarios').value = reg.honorarios || '';
    document.getElementById('status').value = reg.status || 'Pendente';
    document.getElementById('observacao').value = reg.observacao || '';

    renderParcelasPreview(reg.parcelas, reg.vencimento, reg.tipoParcela, reg.totalParcelas);

    document.getElementById('form-title').textContent = "Editar Registro";
    document.getElementById('btn-save').textContent = "Atualizar Registro";
    document.getElementById('btn-cancel').style.display = "inline-block";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// CÁLCULO DE PARCELAS NO FRONT-END
function calcularParcelas() {
    const vencInicial = document.getElementById('vencimento').value;
    const totalParc = parseInt(document.getElementById('totalParcelas').value, 10) || 1;
    const tipo = document.getElementById('tipoParcela').value;

    if (!vencInicial) return;

    const parcelas = [];
    let [ano, mes, dia] = vencInicial.split('-').map(Number);

    for (let i = 1; i <= totalParc; i++) {
        let dataVenc = new Date(ano, mes - 1, dia);
        
        if (i > 1) {
            let mesesAdd = (tipo === 'intercalada') ? 2 : 1;
            dataVenc.setMonth(dataVenc.getMonth() + (mesesAdd * (i - 1)));
        }

        let yyyy = dataVenc.getFullYear();
        let mm = String(dataVenc.getMonth() + 1).padStart(2, '0');
        let dd = String(dataVenc.getDate()).padStart(2, '0');

        parcelas.push({
            numero: i,
            vencimento: `${yyyy}-${mm}-${dd}`,
            pago: false
        });
    }

    renderParcelasPreview(parcelas);
}

function renderParcelasPreview(parcelas) {
    const preview = document.getElementById('parcelas-preview');
    preview.innerHTML = '';

    if (!parcelas || parcelas.length === 0) {
        preview.innerHTML = '<em>Selecione o Vencimento e o Total de Parcelas para gerar o cronograma.</em>';
        return;
    }

    const fragment = document.createDocumentFragment();

    parcelas.forEach(p => {
        const div = document.createElement('div');
        div.className = 'parcela-item';
        div.style.cssText = 'margin-bottom: 6px; display: flex; justify-content: space-between;';
        div.setAttribute('data-numero', p.numero);
        div.setAttribute('data-vencimento', p.vencimento);
        div.setAttribute('data-pago', p.pago);

        const dataFormatada = new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR');
        div.innerHTML = `
            <span>Parcela ${p.numero}: <strong>${dataFormatada}</strong></span>
            <span style="color: ${p.pago ? '#81c784' : '#e57373'}; font-weight: bold;">[${p.pago ? 'Paga' : 'Pendente'}]</span>
        `;
        fragment.appendChild(div);
    });

    preview.appendChild(fragment);
}

// RENDERIZAR TABELA PRINCIPAL (OTIMIZADO)
function renderTable(dados = registros) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum registro encontrado no banco de dados.</td></tr>';
        return;
    }

    const fragment = document.createDocumentFragment();

    dados.forEach(rec => {
        const tr = document.createElement('tr');
        const dtEntrada = rec.vencimentoEntrada ? new Date(rec.vencimentoEntrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

        let parcelasHTML = `<ul class="parcelas-list-table">
            <li>
                <div class="parcela-info">Entrada (${dtEntrada})</div>
                <button class="status-btn ${rec.entradaPaga ? 'status-pago' : 'status-pendente'}" onclick="alternarStatusParcela('${rec.id}', 'entrada')">
                    ${rec.entradaPaga ? 'Pago' : 'Pendente'}
                </button>
            </li>`;

        if (rec.parcelas && rec.parcelas.length > 0) {
            rec.parcelas.forEach((p, idx) => {
                const dtParc = p.vencimento ? new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
                parcelasHTML += `
                    <li>
                        <div class="parcela-info">${p.numero}ª Parc (${dtParc})</div>
                        <button class="status-btn ${p.pago ? 'status-pago' : 'status-pendente'}" onclick="alternarStatusParcela('${rec.id}', ${idx})">
                            ${p.pago ? 'Pago' : 'Pendente'}
                        </button>
                    </li>`;
            });
        }
        parcelasHTML += '</ul>';

        tr.innerHTML = `
            <td><strong>${rec.cliente || '-'}</strong></td>
            <td>${rec.processo || '-'}</td>
            <td>${rec.valorEntrada || 'R$ 0,00'}<br><small>${dtEntrada}</small></td>
            <td>${rec.vencimento ? new Date(rec.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}<br><small>(${rec.tipoParcela || 'fixa'})</small></td>
            <td>${parcelasHTML}</td>
            <td>${rec.honorarios || '-'}</td>
            <td><span class="status-btn ${rec.status === 'Pago' ? 'status-pago' : 'status-pendente'}">${rec.status || 'Pendente'}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action-edit" onclick="editRecord('${rec.id}')">Editar</button>
                    <button class="btn-action-delete" onclick="deleteRecord('${rec.id}')">Excluir</button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
}

// FILTRO RÁPIDO DA TABELA PRINCIPAL
function filterRecords() {
    const termo = document.getElementById('search-input').value.toLowerCase().trim();
    if (!termo) {
        renderTable(registros);
        return;
    }

    const filtrados = registros.filter(r => 
        (r.cliente || '').toLowerCase().includes(termo) ||
        (r.processo || '').toLowerCase().includes(termo) ||
        (r.status || '').toLowerCase().includes(termo) ||
        (r.vencimento || '').includes(termo)
    );

    renderTable(filtrados);
}

// RESET DO FORMULÁRIO
function resetForm() {
    document.getElementById('client-form').reset();
    document.getElementById('record-id').value = '';
    document.getElementById('form-title').textContent = "Inserir Novo Registro";
    document.getElementById('btn-save').textContent = "Salvar Registro";
    document.getElementById('btn-cancel').style.display = "none";
    document.getElementById('parcelas-preview').innerHTML = '<em>Selecione o Vencimento e o Total de Parcelas para gerar o cronograma.</em>';
}
