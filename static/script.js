const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const result = document.getElementById('result');
const jsonOutput = document.getElementById('json-output');
const downloadLink = document.getElementById('download-link');

function showStatus(msg, isError = false){
  status.classList.remove('hidden');
  status.textContent = msg;
  status.style.color = isError ? 'crimson' : 'inherit';
}

function hideStatus(){ status.classList.add('hidden'); }

function showReceiptsStatus(msg, isError = false){
  const receiptsStatus = document.getElementById('receipts-status');
  receiptsStatus.classList.remove('hidden');
  receiptsStatus.textContent = msg;
  receiptsStatus.style.color = isError ? 'crimson' : 'inherit';
}

function hideReceiptsStatus(){ 
  const receiptsStatus = document.getElementById('receipts-status');
  receiptsStatus.classList.add('hidden'); 
}

function showTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Load receipts when switching to receipts tab
  if (tabName === 'receipts') {
    loadReceipts();
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const file = fileInput.files[0];
  if(!file){ showStatus('Please select a PDF file', true); return; }

  const btn = document.getElementById('upload-btn');
  btn.disabled = true;
  showStatus('Uploading and extracting...');

  try{
    const fd = new FormData();
    fd.append('file', file, file.name);

    const resp = await fetch('/extract', { method: 'POST', body: fd });
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error: resp.statusText}));
      showStatus('Server error: ' + (err.error || resp.statusText), true);
      btn.disabled = false;
      return;
    }

    const data = await resp.json();
    const invoice = data.invoice_json || data.invoice || {};
    jsonOutput.textContent = JSON.stringify(invoice, null, 2);
    downloadLink.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(invoice, null, 2));

    result.classList.remove('hidden');
    showStatus('Successfully extracted and saved to database!', false);
    setTimeout(() => hideStatus(), 3000);
  }catch(err){
    showStatus('Request failed: ' + err.message, true);
  }finally{
    btn.disabled = false;
  }
});

async function loadReceipts() {
  const receiptsList = document.getElementById('receipts-list');
  receiptsList.innerHTML = '<p class="loading">Loading receipts...</p>';
  hideReceiptsStatus();
  
  try {
    const resp = await fetch('/receipts');
    if (!resp.ok) {
      throw new Error('Failed to load receipts');
    }
    
    const data = await resp.json();
    const receipts = data.receipts || [];
    
    // Render summary
    renderReceiptsSummary(receipts);

    if (receipts.length === 0) {
      receiptsList.innerHTML = '<p class="empty-state">No receipts found. Upload an invoice to get started!</p>';
      return;
    }

    receiptsList.innerHTML = receipts.map(receipt => `
      <div class="receipt-card" data-id="${receipt.id}">
        <div class="receipt-header">
          <h3>${receipt.supplier || 'Unknown Supplier'}</h3>
          <button class="delete-btn" onclick="deleteReceipt(${receipt.id})" title="Delete receipt">×</button>
        </div>
        <div class="receipt-details">
          <div class="receipt-row">
            <span class="label">Invoice #:</span>
            <span class="value">${receipt.invoice_number || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Date:</span>
            <span class="value">${receipt.invoice_date || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Subtotal:</span>
            <span class="value">${receipt.subtotal || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Tax:</span>
            <span class="value">${receipt.tax || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Total:</span>
            <span class="value total">${receipt.total || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">File:</span>
            <span class="value filename">${receipt.filename || 'N/A'}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Uploaded:</span>
            <span class="value">${formatDate(receipt.uploaded_at)}</span>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (err) {
    showReceiptsStatus('Failed to load receipts: ' + err.message, true);
    receiptsList.innerHTML = '';
  }
}

function parseNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^0-9.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function renderReceiptsSummary(receipts) {
  const summarySection = document.getElementById('receipts-summary');
  const summaryTable = document.getElementById('summary-table');
  if (!summarySection || !summaryTable) return;

  const count = receipts.length;
  const totals = receipts.map(r => parseNumber(r.total));
  const taxes = receipts.map(r => parseNumber(r.tax));
  const subtotalVals = receipts.map(r => parseNumber(r.subtotal));

  const totalSum = totals.reduce((a,b)=>a+b,0);
  const taxSum = taxes.reduce((a,b)=>a+b,0);
  const subtotalSum = subtotalVals.reduce((a,b)=>a+b,0);
  const avg = count ? totalSum / count : 0;

  summaryTable.innerHTML = `
    <div class="summary-grid">
      <div class="summary-item"><div class="summary-title">Count</div><div class="summary-value">${count}</div></div>
      <div class="summary-item"><div class="summary-title">Total Sum</div><div class="summary-value">${totalSum.toFixed(2)}</div></div>
      <div class="summary-item"><div class="summary-title">Total Tax</div><div class="summary-value">${taxSum.toFixed(2)}</div></div>
      <div class="summary-item"><div class="summary-title">Subtotal Sum</div><div class="summary-value">${subtotalSum.toFixed(2)}</div></div>
      <div class="summary-item"><div class="summary-title">Average</div><div class="summary-value">${avg.toFixed(2)}</div></div>
    </div>
  `;

  summarySection.classList.remove('hidden');
}

async function deleteReceipt(receiptId) {
  if (!confirm('Are you sure you want to delete this receipt?')) {
    return;
  }
  
  try {
    const resp = await fetch(`/receipts/${receiptId}`, { method: 'DELETE' });
    if (!resp.ok) {
      throw new Error('Failed to delete receipt');
    }
    
    showReceiptsStatus('Receipt deleted successfully', false);
    setTimeout(() => hideReceiptsStatus(), 3000);
    loadReceipts();
  } catch (err) {
    showReceiptsStatus('Failed to delete receipt: ' + err.message, true);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Load receipts when page loads if on receipts tab
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('receipts-tab').classList.contains('active')) {
    loadReceipts();
  }
});
