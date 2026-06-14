let betrayalMap = {};
let isInjecting = false;
let globalTooltip = null;
let tooltipHideTimeout = null;

// Initial database bootstrap check
chrome.storage.local.get(["betrayalData"], (result) => {
  if (result.betrayalData) {
    betrayalMap = result.betrayalData;
    console.log("RoK Extension: Universal Leaf Framework Active. Unique entries mapped:", Object.keys(betrayalMap).length);
  } else {
    console.log("RoK Extension: Storage cache empty. Waiting on database stream...");
  }
  createGlobalBodyTooltip();
  initObserverAndHeartbeat();
});

// FIXED: Tooltip is attached to the highest layer of document.body, avoiding iframe bounding cuts
function createGlobalBodyTooltip() {
  if (document.querySelector('.rok-global-canvas-tooltip')) return;
  globalTooltip = document.createElement('div');
  globalTooltip.className = 'rok-global-canvas-tooltip';
  document.body.appendChild(globalTooltip);

  globalTooltip.addEventListener('mouseenter', () => {
    if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
  });

  globalTooltip.addEventListener('mouseleave', () => {
    dismissTooltipWithDelay();
  });
}

function initObserverAndHeartbeat() {
  scanGridCanvas();

  if (window.location.hostname.includes("statsmasterdatahub.com") || window.location.hostname.includes("rokmetrics.com")) {
    console.log("RoK Extension: Looker Studio canvas heartbeat loop armed.");
    let runCount = 0;
    const heartbeatInterval = setInterval(() => {
      scanGridCanvas();
      runCount++;
      if (runCount >= 10) {
        clearInterval(heartbeatInterval);
        console.log("RoK Extension: Heartbeat safely defused.");
      }
    }, 2000);
  }

  const observer = new MutationObserver((mutations) => {
    if (isInjecting) return;
    
    let shouldScan = false;
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        const targetNode = mutations[i].addedNodes[0];
        // Instantly bypass checks if mutated nodes belong to our own injections
        if (targetNode.nodeType === Node.ELEMENT_NODE && 
           (targetNode.classList.contains('rok-poop-badge') || targetNode.hasAttribute('data-rok-tracked'))) {
          continue;
        }
        shouldScan = true;
        break;
      }
    }
    
    if (shouldScan) {
      scanGridCanvas();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function scanGridCanvas() {
  if (isInjecting) return;

  // Direct flat selector targeting layout cell text endpoints across Heroscroll, RoKStats, and RoKMetrics
  const textLeaves = document.querySelectorAll('td, span, a, p, b, div.kd-cell, .table-cell, [role="gridcell"]');
  
  for (let i = 0; i < textLeaves.length; i++) {
    const cell = textLeaves[i];
    
    // GUARD 1: Prevent duplicate scans or duplicate emojis if element is already badged
    if (cell.hasAttribute('data-rok-tracked') || cell.querySelector('.rok-poop-badge')) continue;

    const text = (cell.textContent || cell.innerText || "").trim();
    
    // Strict match to ensure we are only catching exact 4-digit kingdom boundaries
    const match = text.match(/\b([123]\d{3})\b/);

    if (match) {
      const lookupKey = String(match[1].trim());

      if (betrayalMap && betrayalMap[lookupKey] && betrayalMap[lookupKey].length > 0) {
        // Trace back the nearest common table row structural container block
        const parentRow = cell.closest('tr, [role="row"], .table-row, .grid-row, .flex-row') || cell.parentElement;
        
        // GUARD 2: Also check if parent row has already processed a tracking flag to stop layered duplicate matches
        if (parentRow && parentRow.hasAttribute('data-rok-tracked')) continue;

        const contextText = ((cell.className || "") + " " + (parentRow?.className || "") + " " + text).toLowerCase();
        
        // GUARD 3: Skip processing text if context belongs to an explicit Rank, Score, Power or Date field
        if (contextText.includes('rank') || contextText.includes('score') || contextText.includes('power') || contextText.includes('date') || contextText.includes('alliance')) {
          continue;
        }

        // Additional sanity checks for standalone naked ranking strings inside metric layouts
        if (cell.parentElement) {
          const siblingText = (cell.parentElement.textContent || "").toLowerCase();
          if (siblingText.includes('rank') && text.length <= 3) continue; 
        }

        injectSafeWarning(cell, parentRow, lookupKey, betrayalMap[lookupKey][0]);
      }
    }
  }
}

function injectSafeWarning(targetCell, parentRow, kdNum, entry) {
  isInjecting = true; // 🔒 LOCK ON: Freeze mutation handlers
  
  try {
    // Apply execution isolation locks to BOTH elements immediately
    targetCell.setAttribute('data-rok-tracked', 'true');
    if (parentRow) parentRow.setAttribute('data-rok-tracked', 'true');
    
    targetCell.classList.add('rok-flagged');

    const badge = document.createElement('span');
    badge.className = 'rok-poop-badge';
    badge.textContent = '💩';
    
    badge.addEventListener('mouseenter', (e) => {
      if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);

      // Render overlay body on our top-level global viewport container canvas
      globalTooltip.innerHTML = `
        <strong>Kingdom ${kdNum} Alert Status</strong><br>
        <hr style="border:0; border-top:1px solid #444; margin:5px 0;">
        📅 <strong>Reported On:</strong> ${entry.reportedOn || "Older Entry"}<br>
        ⚠️ <strong>Type:</strong> ${entry.type || "Betrayal"}<br>
        🌐 <strong>Source:</strong> ${entry.source || "Database"}<br>
        <a href="${entry.link || '#'}" target="_blank" style="color: #5865F2; text-decoration: underline; display: block; margin-top: 6px; font-weight: bold;">Open Discord Evidence</a>
      `;

      globalTooltip.style.display = 'block';

      // Capture dynamic bounding rects to prevent cutoffs across frames
      const rect = badge.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      globalTooltip.style.top = `${rect.top + scrollTop - globalTooltip.offsetHeight - 8}px`;
      globalTooltip.style.left = `${rect.left + scrollLeft - (globalTooltip.offsetWidth / 2) + (rect.width / 2)}px`;
    });

    badge.addEventListener('mouseleave', () => {
      dismissTooltipWithDelay();
    });

    targetCell.appendChild(badge);

  } catch (err) {
    console.error("Badge generation break:", err);
  } finally {
    isInjecting = false; // 🔓 LOCK OFF: Safe to look for valid layouts again
  }
}

function dismissTooltipWithDelay() {
  if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
  tooltipHideTimeout = setTimeout(() => {
    if (globalTooltip) globalTooltip.style.display = 'none';
  }, 200); // 200ms grace buffer allows user cursor access to the evidence link
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "databaseUpdated" && request.data) {
    betrayalMap = request.data;
    scanGridCanvas(); 
  }
});