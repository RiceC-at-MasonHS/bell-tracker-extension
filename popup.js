function renderPopupSchedule() {
  chrome.storage.local.get(['currentDaySchedule'], (data) => {
    const periods = data.currentDaySchedule || [];
    const container = document.getElementById('schedule-list');
    
    if (periods.length === 0) return;
    
    container.innerHTML = ''; // Clear empty state display
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    periods.forEach(period => {
      const row = document.createElement('div');
      row.className = 'period-row';
      
      const [startH, startM] = period.start.split(':').map(Number);
      const [endH, endM] = period.end.split(':').map(Number);
      
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      // Evaluate whether row matches current chronological timestamp context
      if (currentMinutes >= startTotal && currentMinutes < endTotal) {
        row.className += ' active';
      }

      row.innerHTML = `
        <span class="period-name">${period.name}</span>
        <span class="time-slot">${period.start} - ${period.end}</span>
      `;
      container.appendChild(row);
    });
  });
}

// Explicit forced update request handler
document.getElementById('refresh').addEventListener('click', () => {
  const btn = document.getElementById('refresh');
  btn.style.opacity = '0.5';
  
  chrome.runtime.sendMessage({ action: "forceRefresh" }, (response) => {
    btn.style.opacity = '1';
    if (response?.success) {
      renderPopupSchedule();
    }
  });
});

// Run rendering script lifecycle sequence on popup window load execution
document.addEventListener('DOMContentLoaded', renderPopupSchedule);