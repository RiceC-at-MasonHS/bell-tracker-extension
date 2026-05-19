# 🤖 AGENTS.md: AI Collaboration Core Spec

This document establishes the architecture constraints, payload shapes, execution boundaries, and optimization paths for any AI agents, LLMs, or autonomous workflows collaborating on this repository.

---

## 🎯 Project Ethos & Core Guidelines

1. **Zero External Dependencies:** No external UI frameworks (React, Tailwind, Bootstrap) or JavaScript libraries are permitted. Keep the codebase lightweight, highly readable, and performant.
2. **Privacy as a Hard Constraint:** Never introduce analytics, external webhooks, logging endpoints, or external cloud storage. Data must remain 100% trapped inside the local Chrome Extension sandbox.
3. **Manifest V3 Compliance:** The background engine must remain completely stateless, relying entirely on `chrome.alarms` for asynchronous execution loops. Avoid long-running loops or `setInterval()` logic inside `background.js`.

---

## 🌐 Structural Core Schemas

When reading or formatting data, verify your variables against these exact verified endpoint wireframe formats captured from production telemetry. These endpoints include hardcoded 'regions' that could become stale, or noty apply to schools in another area. 

### 1. Session Bootstrap Engine (`users/Init`)

* **Endpoint:** `POST https://smartpass.app/api/prod-us-central/v2/users/Init`
* **Purpose:** Discovers user metadata and identifies the active target `user.id`.
* **Primary Request Payload Shape:**
```json
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "preferred_school_id": 2844
}

```


* **Critical Target Extraction Coordinates:** `response.user.id` and `response.user.display_name`.

### 2. Schedule Calendar Retrieval (`schedules/GetAgendaForDates`)

* **Endpoint:** `POST https://smartpass.app/api/prod-us-central/v2/schedules/GetAgendaForDates`
* **Purpose:** Extracts the precise dynamic grid coordinates mapping classes to timestamps for a specific slot.
* **Primary Request Payload Shape:**
```json
{
  "user_id": 4942806,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}

```


* **Critical Target Extraction Coordinates:** Iterates over the `response.days["YYYY-MM-DD"].period_agendas` array.
* **Atomic Period Object Template:**
```json
{
  "start_time": "07:45",
  "end_time": "08:31",
  "long_name": "Period 1",
  "schedule_group_id": 10904,
  "room_id": 384924
}

```



---

## 💾 Extension Storage Schema (`chrome.storage.local`)

To keep local queries standardized, ensure reading or modifying operations strictly adhere to these specific object layouts:

```javascript
{
  // Flattened array of active structural periods for the running day context
  "currentDaySchedule": [
    { "name": "Period 1", "start": "07:45", "end": "08:31" },
    { "name": "Period 2", "start": "08:36", "end": "09:22" }
  ],
  // Tracked date string used as a validation gate before making recurring server queries
  "lastFetchedDate": "2026-05-18",
  // Optional identity string extracted via user initialization routine
  "userName": "Corey Rice"
}

```

---

## 🚀 Execution Lifecycles & Tickers

### Network Sync Sequence (`hourlyNetworkSync`)

* Fires on install, browser boot, and at an incremental 60-minute interval.
* **Chain Flow:** Reads current dynamic system date string -> Queries `users/Init` -> Extracts dynamic `user_id` -> Chains directly to `GetAgendaForDates` -> Normalizes payload data into a flat array -> Commits variables to local state -> Explicitly triggers `updateVisualBadgeCountdown()`.

### Temporal Update Engine (`minuteClock`)

* Fires on an isolated 60-second execution tick managed by a system alarm container.
* **Math Logic Workflow:** 1. Captures system running state `hours` and `minutes`.
2. Projects state value into a flat scalar measurement space: $MinutesTotal = (Hours \times 60) + Minutes$.
3. Evaluates scalar position value against the lower bound ($Start \times 60$) and upper bound ($End \times 60$) parameters of every entry inside `currentDaySchedule`.
4. Deducts position from upper limit to calculate time remaining. Updates badge text UI context cleanly.

---

## 🛠️ Prioritized Backlog / Future Expansion Vectors

When taking on issues, work down these specific evolutionary objectives:

1. **[Show bell number in extension icon](https://github.com/RiceC-at-MasonHS/bell-tracker-extension/issues/1):** The extension image (pinned in the URL bar area) should show the current bell. The images (really just text) that need to be there are:
    - `1` < first bell
    - `2` < second bell
    - `3` < third bell
    - `4` < fourth bell
    - `5` < fifth bell
    - `6` < sixth bell
    - `7` < seventh bell
    - `C` < connect bell
    - `S` < special bell (catchall for exception cases)
2. **[Countdown Timer should be an option](https://github.com/RiceC-at-MasonHS/bell-tracker-extension/issues/2):** Some users will want the number to be on display all the time. 
Others will want to have the extension Icon to clearly show the current bell.  We should make it so the users have a checkbox option on the 'popup' to choose if they want the countdown badge text to show or not. 
3. **Dynamic School ID Resolution:** Abstract out the hardcoded `SCHOOL_ID = 2844` constant by reading the school ID directly out of the `users/Init` payload parameters dynamically on boot. This also would include making the regions dynamic, so endpoints that reach out to `.../api/prod-us-central/v2/...` can work for schools in any part of boader Smartpass service area.
4. **Passing Period Visual Tracker:** Instead of showing a generic flat line (`-`) when an active class cannot be matched, update the processing math engine to track if the current timestamp fits between the `end_time` of period $N$ and the `start_time` of period $N+1$, altering badge aesthetics to indicate a passing countdown.
5. **PowerSchool Data Integration Pipeline:** Bridge complementary rosters or classroom specific context parameters directly into rows by introducing selective API content scraping on PowerSchool dashboard URLs.
