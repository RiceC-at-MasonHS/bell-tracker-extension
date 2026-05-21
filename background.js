// background.js - Core logic for SmartPass Schedule Sync and Badge Countdown
const SCHOOL_ID = 2844;

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// NEW: maps period name → badge character per Issue #1
function getBellIdentifier(name) {
  if (!name) return 'S';
  const numbered = name.match(/bell\s*(\d)/i) || name.match(/period\s*(\d)/i);
  if (numbered) {
    const n = parseInt(numbered[1], 10);
    if (n >= 1 && n <= 7) return String(n);
  }
  if (/connect/i.test(name)) return 'C';
  return 'S';
}

async function syncSmartPassSchedule() {
  const todayStr = getLocalDateString();
  const tomorrowStr = getLocalDateString(1);

  try {
    const initResponse = await fetch('https://smartpass.app/api/prod-us-central/v2/users/Init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ start_date: todayStr, end_date: tomorrowStr, preferred_school_id: SCHOOL_ID })
    });

    if (!initResponse.ok) throw new Error("User session not found or cookie expired.");
    const initData = await initResponse.json();
    const userId = initData?.user?.id;
    if (!userId) throw new Error("Could not parse explicit user ID context.");

    const agendaResponse = await fetch('https://smartpass.app/api/prod-us-central/v2/schedules/GetAgendaForDates', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-school-id': String(SCHOOL_ID) },
      body: JSON.stringify({ user_id: userId, start_date: todayStr, end_date: tomorrowStr })
    });

    if (!agendaResponse.ok) throw new Error("Failed to map schedule coordinates.");
    const agendaData = await agendaResponse.json();

    const todayData = agendaData.days?.[todayStr];
    if (todayData?.period_agendas) {
      const cleanPeriods = todayData.period_agendas.map(p => ({
        name: p.long_name,
        bellId: getBellIdentifier(p.long_name), // NEW
        start: p.start_time,
        end: p.end_time
      }));

      await chrome.storage.local.set({ currentDaySchedule: cleanPeriods, lastFetchedDate: todayStr });
      updateVisualBadgeCountdown();
    }
  } catch (error) {
    console.error("Automated background sync skipped:", error.message);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });
  }
}

async function updateVisualBadgeCountdown() {
  const data = await chrome.storage.local.get(['currentDaySchedule', 'lastFetchedDate', 'showCountdown']); // NEW: showCountdown
  const todayStr = getLocalDateString();

  if (data.lastFetchedDate !== todayStr) {
    syncSmartPassSchedule();
    return;
  }

  const periods = data.currentDaySchedule || [];
  const showCountdown = data.showCountdown !== false; // NEW: default ON
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let activePeriod = null;

  for (let period of periods) {
    const [startH, startM] = period.start.split(':').map(Number);
    const [endH, endM] = period.end.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (currentMinutes >= startTotal && currentMinutes < endTotal) {
      activePeriod = { bellId: period.bellId, remaining: endTotal - currentMinutes }; // NEW: bellId
      break;
    }
  }

  if (activePeriod) {
    // NEW: branch on preference
    chrome.action.setBadgeText({ text: showCountdown ? String(activePeriod.remaining) : activePeriod.bellId });
    chrome.action.setBadgeBackgroundColor({ color: showCountdown ? "#1976D2" : "#388E3C" });
  } else {
    chrome.action.setBadgeText({ text: "-" });
    chrome.action.setBadgeBackgroundColor({ color: "#757575" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("clockTicker", { periodInMinutes: 1 });
  chrome.alarms.create("networkSync", { periodInMinutes: 60 });
  syncSmartPassSchedule();
});

chrome.runtime.onStartup.addListener(() => {
  syncSmartPassSchedule();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "clockTicker") updateVisualBadgeCountdown();
  else if (alarm.name === "networkSync") syncSmartPassSchedule();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "forceRefresh") {
    syncSmartPassSchedule().then(() => sendResponse({ success: true }));
    return true;
  }
  if (request.action === "badgeModeChanged") { // NEW
    updateVisualBadgeCountdown().then(() => sendResponse({ success: true }));
    return true;
  }
});
