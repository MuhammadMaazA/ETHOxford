const API_BASE = 'https://hatchmark.vercel.app';

// Inline pHash computation for popup (self-contained, no content script access)
const DCT_SZ = 32;
const HASH_SZ = 8;
let _dct = null;

function getDCT() {
  if (_dct) return _dct;
  _dct = [];
  for (let k = 0; k < DCT_SZ; k++) {
    const row = [];
    for (let n = 0; n < DCT_SZ; n++) {
      row.push(Math.cos((Math.PI / DCT_SZ) * (n + 0.5) * k));
    }
    _dct.push(row);
  }
  return _dct;
}

function dct2d(matrix) {
  const d = getDCT();
  const s = matrix.length;
  const t = [];
  for (let y = 0; y < s; y++) {
    const r = [];
    for (let k = 0; k < s; k++) {
      let sum = 0;
      for (let n = 0; n < s; n++) sum += matrix[y][n] * d[k][n];
      r.push(sum);
    }
    t.push(r);
  }
  const res = [];
  for (let y = 0; y < s; y++) {
    const r = [];
    for (let x = 0; x < s; x++) {
      let sum = 0;
      for (let n = 0; n < s; n++) sum += t[n][x] * d[y][n];
      r.push(sum);
    }
    res.push(r);
  }
  return res;
}

function computeHash(img) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = DCT_SZ;
  c.height = DCT_SZ;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, DCT_SZ, DCT_SZ);

  const px = ctx.getImageData(0, 0, DCT_SZ, DCT_SZ).data;
  const gray = [];
  for (let y = 0; y < DCT_SZ; y++) {
    const r = [];
    for (let x = 0; x < DCT_SZ; x++) {
      const i = (y * DCT_SZ + x) * 4;
      r.push(0.299 * px[i] + 0.587 * px[i+1] + 0.114 * px[i+2]);
    }
    gray.push(r);
  }

  const dr = dct2d(gray);
  const lf = [];
  for (let y = 0; y < HASH_SZ; y++)
    for (let x = 0; x < HASH_SZ; x++)
      if (x !== 0 || y !== 0) lf.push(dr[y][x]);

  const sorted = [...lf].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];

  let bin = '';
  for (let y = 0; y < HASH_SZ; y++)
    for (let x = 0; x < HASH_SZ; x++)
      bin += (x === 0 && y === 0) ? '0' : (dr[y][x] > med ? '1' : '0');

  let hex = '';
  for (let i = 0; i < bin.length; i += 4)
    hex += parseInt(bin.substr(i, 4), 2).toString(16);

  return hex;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    // Fetch through extension's background to bypass CORS
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
      })
      .catch(reject);
  });
}

const resultEl = document.getElementById('result');
const btnEl = document.getElementById('checkBtn');
const urlEl = document.getElementById('imageUrl');

btnEl.addEventListener('click', async () => {
  const url = urlEl.value.trim();
  if (!url) return;

  btnEl.disabled = true;
  btnEl.textContent = 'Checking...';
  resultEl.className = 'result';
  resultEl.style.display = 'none';

  try {
    const img = await loadImage(url);
    const hash = computeHash(img);

    const res = await fetch(`${API_BASE}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    });
    const data = await res.json();

    resultEl.style.display = 'block';

    if (data.isOriginal) {
      resultEl.className = 'result show original';
      resultEl.innerHTML = '<strong>Original Content</strong><br>No matches found in the registry.';
    } else {
      resultEl.className = 'result show matches';
      const matchHtml = data.matches.slice(0, 3).map(m => `
        <div class="match-item">
          <div style="display:flex;justify-content:space-between">
            <span class="title">${escapeHtml(m.title || 'Untitled')}</span>
            <span class="score">${m.similarity}%</span>
          </div>
          <div class="creator">${m.creator.slice(0,10)}...${m.creator.slice(-6)}</div>
          <a href="https://suiscan.xyz/testnet/object/${m.cert_id}" target="_blank">View on Suiscan &rarr;</a>
        </div>
      `).join('');
      resultEl.innerHTML = `<strong>${data.matches.length} Match${data.matches.length > 1 ? 'es' : ''} Found</strong>${matchHtml}`;
    }
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.className = 'result show error';
    resultEl.innerHTML = `<strong>Error</strong><br>${escapeHtml(err.message)}`;
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = 'Check Authenticity';
  }
});

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
