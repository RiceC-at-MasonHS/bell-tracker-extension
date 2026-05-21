function renderPopupSchedule() {
  chrome.storage.local.get(['currentDaySchedule'], (data) => {
    const periods = data.currentDaySchedule || [];
    const container = document.getElementById('schedule-list');
    if (periods.length === 0) return;
    container.innerHTML = '';
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    periods.forEach(period => {
      const row = document.createElement('div');
      row.className = 'period-row';
      const [startH, startM] = period.start.split(':').map(Number);
      const [endH, endM] = period.end.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      const duration = endTotal - startTotal;
      row.style.minHeight = `${Math.max(duration * 0.8, 36)}px`;
      let timeLineHtml = '';
      if (currentMinutes >= startTotal && currentMinutes < endTotal) {
        row.className += ' active';
        const elapsedMinutes = currentMinutes - startTotal;
        const percentComplete = (elapsedMinutes / duration) * 100;
        timeLineHtml = `<div class="time-line" style="top: ${percentComplete}%;"></div>`;
      }
      const localName = period.name.replace(/Period/gi, 'Bell');
      row.innerHTML = `
        ${timeLineHtml}
        <span class="period-name">${localName}</span>
        <span class="time-slot">${period.start} - ${period.end} (${duration}m)</span>
      `;
      container.appendChild(row);
    });
  });
}

document.getElementById('refresh').addEventListener('click', () => {
  const btn = document.getElementById('refresh');
  btn.style.opacity = '0.5';
  chrome.runtime.sendMessage({ action: "forceRefresh" }, (response) => {
    btn.style.opacity = '1';
    if (response?.success) renderPopupSchedule();
  });
});

// NEW: initialize checkbox state and wire up change handler
chrome.storage.local.get(['showCountdown'], (data) => {
  document.getElementById('countdown-toggle').checked = data.showCountdown !== false;
});

document.getElementById('countdown-toggle').addEventListener('change', (e) => {
  chrome.storage.local.set({ showCountdown: e.target.checked }, () => {
    chrome.runtime.sendMessage({ action: "badgeModeChanged" });
  });
});

document.addEventListener('DOMContentLoaded', renderPopupSchedule);
