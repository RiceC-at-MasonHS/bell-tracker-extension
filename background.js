// Helper to generate dynamic local date strings safely
function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Main background pipeline to pull identity and target day agendas
async function syncMasonSchedule() {
  const todayStr = getLocalDateString();

  try {
    // Use official Mason API
    const agendaResponse = await fetch('https://storage.googleapis.com/mcs-bell-api/schedule.json');

    if (!agendaResponse.ok) throw new Error("Failed to map schedule coordinates.");
    const agendaData = await agendaResponse.json();

    const todayData = agendaData.buildings?.[0];
    if (todayData?.periods) {
      const cleanPeriods = todayData.periods
      // Filter out Period 8 (period_id === "P8")
      .filter(p => p.period_id !== "P8")
      .map(p => ({
        name: p.name,
        start: p.start_time,
        end: p.end_time
      }));

      // Commit cleanly to local browser storage sandbox
      await chrome.storage.local.set({ 
        currentDaySchedule: cleanPeriods,
        lastFetchedDate: todayStr 
      });
      
      // Instantly run calculation update once fresh data drops
      updateVisualBadgeCountdown();
    }
  } catch (error) {
    console.error("Automated background sync skipped:", error.message);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });
  }
}

// Calculates time blocks dynamically and projects numbers onto the extension icon
async function updateVisualBadgeCountdown() {
  const data = await chrome.storage.local.get([
    'currentDaySchedule',
    'lastFetchedDate',
    "hideTimer"
  ]);

  if (data.hideTimer === true) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const todayStr = getLocalDateString();

  if (data.lastFetchedDate !== todayStr) {
    syncMasonSchedule();
    return;
  }

  const periods = data.currentDaySchedule || [];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let activePeriod = null;

  for (let period of periods) {
    const [startH, startM] = period.start.split(':').map(Number);
    const [endH, endM] = period.end.split(':').map(Number);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (currentMinutes >= startTotal && currentMinutes < endTotal) {
      activePeriod = {
        name: period.name,
        remaining: endTotal - currentMinutes
      };
      break;
    }
  }

  if (activePeriod) {
    // Show only the numeric value inside the badge canvas
    chrome.action.setBadgeText({ text: String(activePeriod.remaining) });
    chrome.action.setBadgeBackgroundColor({ color: "#1976D2" }); // Deep Blue while inside an active class window
  } else {
    // Clear or mark passing time
    chrome.action.setBadgeText({ text: "-" });
    chrome.action.setBadgeBackgroundColor({ color: "#757575" }); // Neutral Grey for out-of-bounds or passing periods
  }
}

// Wire up structural listeners and engine tickers
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("clockTicker", { periodInMinutes: 1 });
  chrome.alarms.create("networkSync", { periodInMinutes: 60 });
  syncMasonSchedule();
});

chrome.runtime.onStartup.addListener(() => {
  syncMasonSchedule();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "clockTicker") {
    updateVisualBadgeCountdown();
  } else if (alarm.name === "networkSync") {
    syncMasonSchedule();
  }
});

// Listener to handle forced manual refreshes triggered by the popup interface
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "forceRefresh") {
    syncMasonSchedule().then(() => sendResponse({ success: true }));
    return true; 
  }

  if (request.action === "updateTimerVisibility"){
    updateVisualBadgeCountdown();
    sendResponse({ success: true });
    return true;
  }
});
