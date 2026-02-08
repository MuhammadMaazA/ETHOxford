// Hatchmark Content Script — handles image hashing, API calls, and result overlay

const HATCHMARK_OVERLAY_ID = 'hatchmark-overlay';

function removeOverlay() {
  const existing = document.getElementById(HATCHMARK_OVERLAY_ID);
  if (existing) existing.remove();
}

function createOverlay() {
  removeOverlay();

  const overlay = document.createElement('div');
  overlay.id = HATCHMARK_OVERLAY_ID;
  overlay.innerHTML = `
    <div class="hatchmark-panel">
      <div class="hatchmark-header">
        <div class="hatchmark-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>Hatchmark</span>
        </div>
        <button class="hatchmark-close" id="hatchmark-close">&times;</button>
      </div>
      <div class="hatchmark-body" id="hatchmark-body">
        <div class="hatchmark-loading">
          <div class="hatchmark-spinner"></div>
          <p>Checking authenticity...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('hatchmark-close').addEventListener('click', removeOverlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeOverlay();
  });

  return overlay;
}

function renderResults(body, data, hash) {
  if (data.error) {
    body.innerHTML = `
      <div class="hatchmark-error">
        <p>Verification failed</p>
        <p class="hatchmark-detail">${data.error}</p>
      </div>
    `;
    return;
  }

  const hashDisplay = `
    <div class="hatchmark-hash">
      <span class="hatchmark-label">Perceptual Hash</span>
      <code>${hash}</code>
    </div>
  `;

  if (data.isOriginal) {
    body.innerHTML = `
      ${hashDisplay}
      <div class="hatchmark-result hatchmark-original">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>
          <p class="hatchmark-result-title">Original Content</p>
          <p class="hatchmark-result-detail">No matches found in the Hatchmark registry</p>
        </div>
      </div>
      <p class="hatchmark-total">${data.totalRegistrations || 0} images checked</p>
    `;
  } else {
    const matchesHtml = data.matches.slice(0, 5).map(m => `
      <div class="hatchmark-match">
        <div class="hatchmark-match-header">
          <span class="hatchmark-match-title">${escapeHtml(m.title || 'Untitled')}</span>
          <span class="hatchmark-match-score ${m.similarity >= 95 ? 'hatchmark-score-high' : 'hatchmark-score-med'}">
            ${m.similarity}% match
          </span>
        </div>
        <p class="hatchmark-match-creator">
          ${m.creator.slice(0, 10)}...${m.creator.slice(-6)}
        </p>
        <p class="hatchmark-match-date">
          Registered ${new Date(m.registered_at || m.timestamp).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          })}
        </p>
        <a href="https://suiscan.xyz/testnet/object/${m.cert_id}" target="_blank" rel="noopener" class="hatchmark-match-link">
          View on Suiscan &rarr;
        </a>
      </div>
    `).join('');

    body.innerHTML = `
      ${hashDisplay}
      <div class="hatchmark-result hatchmark-flagged">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p class="hatchmark-result-title">${data.matches.length} Match${data.matches.length > 1 ? 'es' : ''} Found</p>
          <p class="hatchmark-result-detail">This image may already be registered on-chain</p>
        </div>
      </div>
      <div class="hatchmark-matches">${matchesHtml}</div>
      <a href="https://ethoxford.onrender.com/verify" target="_blank" rel="noopener" class="hatchmark-cta">
        Open Full Verification &rarr;
      </a>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'HATCHMARK_CHECK') return;

  const overlay = createOverlay();
  const body = document.getElementById('hatchmark-body');
  const apiBase = message.apiBase || 'https://ethoxford.onrender.com';

  (async () => {
    try {
      // Compute perceptual hash from the image data URL
      const hash = await computePerceptualHashFromDataUrl(message.imageDataUrl);

      // Update loading message
      body.innerHTML = `
        <div class="hatchmark-loading">
          <div class="hatchmark-spinner"></div>
          <p>Checking registry...</p>
          <code style="font-size:11px;color:#888;margin-top:4px;display:block">${hash}</code>
        </div>
      `;

      // Call the Hatchmark verify API
      const res = await fetch(`${apiBase}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });

      const data = await res.json();
      renderResults(body, data, hash);
    } catch (err) {
      body.innerHTML = `
        <div class="hatchmark-error">
          <p>Verification failed</p>
          <p class="hatchmark-detail">${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  })();
});
