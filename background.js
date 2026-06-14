const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzdxQXM2KaQOr1tqI6smfQYfCD93CIYDVB-Lh937YV7I6aVUMEPAhi3m_q3bfuZjdmDT4IbPk5rJTM/pub?output=csv";

function parseCSV(csvText) {
  // Normalize line endings cleanly across different OS systems
  const lines = csvText.replace(/\r/g, "").split("\n");
  const data = {};
  
  console.log("Raw CSV headers detected:", lines[0]);

  // Comprehensive CSV line splitter that natively respects quotes and commas
  function splitCSVLine(line) {
    const result = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Toggle state when encountering quote boundaries
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        // Split cell when hit a comma outside of a quote block
        result.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    // Push the remaining data chunk at the end of the string row
    result.push(currentCell.trim());
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (!currentLine) continue; // Bypass blank lines
    
    // Parse using the robust quote-aware parser loop
    const columns = splitCSVLine(currentLine);
    const kingdomNum = columns[0];
    
    if (kingdomNum && !isNaN(kingdomNum)) {
      if (!data[kingdomNum]) {
        data[kingdomNum] = [];
      }
      
      // Map columns exactly using safe index limits: A=0, B=1, C=2, D=3, E=4
      data[kingdomNum].push({
        type: columns[1] || "Unknown",
        source: columns[2] || "Reported",
        link: columns[3] || "#",
        reportedOn: columns[4] || "Older Entry"
      });
    }
  }
  
  console.log("Parsing finalized. Total monitored kingdoms logged:", Object.keys(data).length);
  return data;
}

async function syncDatabase() {
  console.log("Syncing database from Google Sheet...");
  try {
    const response = await fetch(`${CSV_URL}&t=${Date.now()}`); // Cache-busting parameter added
    if (!response.ok) throw new Error(`HTTP fetch error code: ${response.status}`);
    
    const csvText = await response.text();
    const parsedData = parseCSV(csvText);
    
    // Explicitly commit database to local storage
    await chrome.storage.local.set({ betrayalData: parsedData });
    console.log("Database successfully populated to storage:", parsedData);

    // ⚡ INTER-SCRIPT BROADCAST: Notify all running tabs to hot-reload their data maps instantly
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: "databaseUpdated", data: parsedData }).catch(() => {
        // Silent catch to ignore tabs where our extension script isn't running (e.g., chrome:// settings tabs)
      });
    });

  } catch (error) {
    console.error("Critical error syncing database:", error);
  }
}

// Listen for message inquiries coming directly from the popup menu or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "forceManualSync") {
    syncDatabase().then(() => sendResponse({ success: true }));
    return true; // Keep message communication channels open for async return
  }
});

chrome.runtime.onInstalled.addListener(() => {
  syncDatabase();
});

chrome.alarms.create("syncAlarm", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncAlarm") syncDatabase();
});