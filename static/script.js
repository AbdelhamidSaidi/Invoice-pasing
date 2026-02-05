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
    hideStatus();
  }catch(err){
    showStatus('Request failed: ' + err.message, true);
  }finally{
    btn.disabled = false;
  }
});
