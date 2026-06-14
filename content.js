let betrayalMap = {};
let isInjecting = false;
let globalTooltip = null;
let hideTimeout = null;

// Initial database bootstrap check
chrome.storage.local.get(["betrayalData"], (result) => {
  if (result.betrayalData) {
    betrayalMap = result.betrayalData;
    console.log("RoK Extension: Restored Deep Shadow DOM Scanner Active. Unique entries mapped:", Object.keys(betrayalMap).length);
  } else {
    console.log("RoK Extension: Storage cache empty. Waiting on database stream...");
  }
  createGlobalTooltip();
  initObserverAndHeartbeat();
});

function createGlobalTooltip() {
  if (window.top !== window) return;
  
  globalTooltip = document.createElement('div');
  globalTooltip.className = 'rok-global-tooltip';
  document.body.appendChild(globalTooltip);

  globalTooltip.addEventListener('mouseenter', () => {
    if (hideTimeout) clearTimeout(hideTimeout);
  });

  globalTooltip.addEventListener('mouseleave', () => {
    startHideTimer();
  });
}

function initObserverAndHeartbeat() {
  targetedGridScan();

  if (window.location.hostname.includes("statsmasterdatahub.com")) {
    console.log("RoK Extension: Looker Studio canvas heartbeat loop armed.");
    let runCount = 0;
    const heartbeatInterval = setInterval(() => {
      targetedGridScan();
      runCount++;
      if (runCount >= 10) {
        clearInterval(heartbeatInterval);
        console.log("RoK Extension: Heartbeat safely defused.");
      }
    }, 2000);
  }

  // ⚡ FIXED OBSERVER: Strict injection lock checks to prevent infinite layout freeze loops
  const observer = new MutationObserver((mutations) => {
    if (isInjecting) return; // Drop execution instantly if we caused the change
    
    let shouldScan = false;
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Skip changes caused directly by our own badge class
        const targetNode = mutation.addedNodes[0];
        if (targetNode.nodeType === Node.ELEMENT_NODE && 
           (targetNode.classList.contains('rok-poop-badge') || targetNode.classList.contains('rok-flagged'))) {
          continue;
        }
        shouldScan = true;
        break;
      }
    }
    
    if (shouldScan) {
      targetedGridScan();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function targetedGridScan() {
  if (isInjecting) return; // Safety lock block
  
  const dashboardContainers = document.querySelectorAll('lego-table, [role="grid"], [role="row"], .gviz-table-page, iframe, table, tr, td');
  
  if (dashboardContainers.length === 0) {
    deepScan(document.body);
    return;
  }

  dashboardContainers.forEach(container => {
    deepScan(container);
    if (container.shadowRoot) {
      deepScan(container.shadowRoot);
    }
  });
}

function deepScan(node) {
  if (!node || isInjecting) return;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toUpperCase();
    if (!['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'TH', 'SELECT'].includes(tagName)) {
      checkAndInjectBadge(node);
    }
  }

  if (node.shadowRoot) {
    deepScan(node.shadowRoot);
  }

  let child = node.firstChild;
  while (child) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      deepScan(child);
    }
    child = child.nextSibling;
  }
}

function checkAndInjectBadge(el) {
  if (isInjecting) return;
  
  // Guard 1: Prevent parsing elements that already have our tracking badges
  if (el.children.length > 0 && !el.querySelector('.rok-poop-badge')) {
    if (el.children[0].className !== 'rok-poop-badge') return;
  }

  const text = (el.innerText || el.textContent || "").trim();
  const match = text.match(/(?:KD|K|#)?\s*([123]\d{3})\b/i);

  if (match) {
    const kdNum = match[1].trim();
    const lookupKey = String(kdNum);

    if (betrayalMap && betrayalMap[lookupKey] && betrayalMap[lookupKey].length > 0) {
      const contextText = (el.className + " " + el.parentElement?.className + " " + text).toLowerCase();
      
      // Safety rule adjustments: don't flag labels or date headers
      if (contextText.includes('rank') || contextText.includes('score') || contextText.includes('date') || contextText.includes('power')) return;

      const targetCount = betrayalMap[lookupKey].length;
      const currentCount = el.querySelectorAll('.rok-poop-badge').length;

      if (currentCount === targetCount) return;

      injectSafeWarnings(el, lookupKey, betrayalMap[lookupKey]);
    }
  }
}

function getSecureCoords(badge) {
  let rect = badge.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width
  };
}

function injectSafeWarnings(element, kdNum, incidentsList) {
  isInjecting = true; // 🔒 LOCK ON: Freeze mutation observer checks
  
  try {
    const existingBadges = element.querySelectorAll('.rok-poop-badge');
    existingBadges.forEach(b => b.remove());

    element.classList.add('rok-flagged');

    incidentsList.forEach((data, index) => {
      const badge = document.createElement('span');
      badge.className = 'rok-poop-badge';
      badge.textContent = '💩';
      
      badge.addEventListener('mouseenter', (e) => {
        const coords = getSecureCoords(badge);

        window.top.postMessage({
          action: "showRokTooltip",
          screenY: e.pageY || coords.top,
          screenX: e.pageX || coords.left,
          top: coords.top,
          left: coords.left,
          width: coords.width,
          kdNum: kdNum,
          index: index,
          total: incidentsList.length,
          data: data
        }, "*");
      });

      badge.addEventListener('mouseleave', () => {
        window.top.postMessage({ action: "hideRokTooltip" }, "*");
      });

      element.appendChild(badge);
    });
  } catch (err) {
    console.error("Badge generation break:", err);
  } finally {
    isInjecting = false; // 🔓 LOCK OFF: Safe to track external layout updates again
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "databaseUpdated" && request.data) {
    betrayalMap = request.data;
    console.log("RoK Extension: Front-end data map hot-reloaded successfully.", Object.keys(betrayalMap).length);
    targetedGridScan(); 
  }
});

window.addEventListener("message", (event) => {
  if (window.top !== window || !globalTooltip) return;
  const msg = event.data;

  if (msg.action === "showRokTooltip") {
    if (hideTimeout) clearTimeout(hideTimeout);
    
    globalTooltip.innerHTML = `
      <strong>Kingdom ${msg.kdNum}</strong> <span style="float:right; color:#888;">(${msg.index + 1}/${msg.total})</span><br>
      <hr style="border:0; border-top:1px solid #444; margin:4px 0;">
      📅 <strong>Reported On:</strong> ${msg.data.reportedOn || "Older Entry"}<br>
      ⚠️ <strong>Type:</strong> ${msg.data.type}<br>
      🌐 <strong>Source:</strong> ${msg.data.source}<br>
      <a href="${msg.data.link}" target="_blank" style="color: #ff4d4d; text-decoration: underline; display: block; margin-top: 6px;">Open Discord Thread</a>
    `;
    
    globalTooltip.style.display = 'block';
    
    let targetTop = msg.top;
    let targetLeft = msg.left;

    if (msg.top < 500 && window.scrollY > 200) {
      targetTop = msg.screenY;
      targetLeft = msg.screenX;
    }

    globalTooltip.style.top = `${targetTop - globalTooltip.offsetHeight - 8}px`;
    globalTooltip.style.left = `${targetLeft - (globalTooltip.offsetWidth / 2) + (msg.width / 2)}px`;
  }
  
  if (msg.action === "hideRokTooltip") {
    startHideTimer();
  }
});

function startHideTimer() {
  if (hideTimeout) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (globalTooltip) globalTooltip.style.display = 'none';
  }, 150);
}