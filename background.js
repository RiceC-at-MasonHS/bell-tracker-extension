// background.js - Core logic for SmartPass Schedule Sync and Badge Countdown
const SCHOOL_ID = 2844; // Static school ID for the target institution, can be made dynamic if needed

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
async function syncSmartPassSchedule() {
  const todayStr = getLocalDateString();
  const tomorrowStr = getLocalDateString(1);

  try {
    // Step 1: Bootstrap Identity via active cookies
    const initResponse = await fetch('https://smartpass.app/api/prod-us-central/v2/users/Init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        start_date: todayStr,
        end_date: tomorrowStr,
        preferred_school_id: SCHOOL_ID
      })
    });

    if (!initResponse.ok) throw new Error("User session not found or cookie expired.");
    const initData = await initResponse.json();
    const userId = initData?.user?.id;
    
    if (!userId) throw new Error("Could not parse explicit user ID context.");

    // Step 2: Extract real-time agenda for current calendar slot
    const agendaResponse = await fetch('https://smartpass.app/api/prod-us-central/v2/schedules/GetAgendaForDates', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-school-id': String(SCHOOL_ID)
      },
      body: JSON.stringify({
        user_id: userId,
        start_date: todayStr,
        end_date: tomorrowStr
      })
    });

    if (!agendaResponse.ok) throw new Error("Failed to map schedule coordinates.");
    const agendaData = await agendaResponse.json();

    const todayData = agendaData.days?.[todayStr];
    if (todayData?.period_agendas) {
      const cleanPeriods = todayData.period_agendas.map(p => ({
        name: p.long_name,
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
  const data = await chrome.storage.local.get(['currentDaySchedule', 'lastFetchedDate']);
  const todayStr = getLocalDateString();

  if (data.lastFetchedDate !== todayStr) {
    syncSmartPassSchedule();
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
  syncSmartPassSchedule();
});

chrome.runtime.onStartup.addListener(() => {
  syncSmartPassSchedule();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "clockTicker") {
    updateVisualBadgeCountdown();
  } else if (alarm.name === "networkSync") {
    syncSmartPassSchedule();
  }
});

// Listener to handle forced manual refreshes triggered by the popup interface
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "forceRefresh") {
    syncSmartPassSchedule().then(() => sendResponse({ success: true }));
    return true; 
  }
});