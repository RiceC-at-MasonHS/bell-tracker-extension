# Privacy Policy for Bell Tracker (Chrome Extension)

**Effective Date:** May 19, 2026

## 1. Introduction
This Privacy Policy applies to the **Bell Tracker Chrome Extension** ("the Extension"). We believe that student and educator data should remain strictly confidential. This Extension was built with a "Privacy-by-Design" architecture, meaning **it does not collect, track, or transmit any personal data to the developer or any third-party servers.**

## 2. Information We Process
The Extension does not collect personal information for external use. However, to function properly, it locally processes the following data directly from your active session on `smartpass.app`:
* **User Identification:** A dynamic SmartPass User ID is retrieved to correctly fetch your specific daily schedule.
* **Schedule Data:** Your daily bell schedule (class periods, start times, and end times) is requested from the SmartPass API.

**Crucially, this data is never sent to the developer, any analytics service, or any external database.**

## 3. How Your Data is Used
The data processed by the Extension is used exclusively for one purpose:
* To calculate the time remaining in your current class period and display it on the Extension's badge icon and within the dropdown popup.

## 4. Data Storage and Security
All schedule and session data required by the Extension is saved strictly to your browser's local sandbox using Chrome's native `chrome.storage.local` API. 
* **Local Only:** This data resides physically on your computer's hard drive.
* **No Cloud Sync:** The Extension does not sync this data to your Google Account or external cloud environments.
* **Ephemeral:** Clearing your browser data or uninstalling the Extension will permanently delete this localized data.

## 5. Third-Party Access and Analytics
* **No Telemetry:** We do not use Google Analytics, tracking pixels, or error-reporting software.
* **No Third-Party Sharing:** Your data is never sold, rented, or shared with any third-party services. The Extension communicates exclusively with the official SmartPass API (`https://smartpass.app/*`).

## 6. Required Extension Permissions Justification
To comply with Chrome Web Store transparency guidelines, here is exactly why the Extension requests its specific permissions:
* `storage`: Required to save your daily schedule locally so the Extension can run calculations without constantly polling the network.
* `alarms`: Required to run the 60-second background countdown timer efficiently without draining your computer's battery or memory.
* `Host Permission (https://*.smartpass.app/*)`: Required to securely "piggyback" on your active login cookies to fetch your schedule directly from SmartPass without asking you for a password.

## 7. Changes to This Privacy Policy
If we update the Extension to require new permissions or handle data differently, we will update this Privacy Policy accordingly. Minor updates will be reflected by the "Effective Date" at the top of this document.

## 8. Contact Information
If you have any questions or concerns regarding this Privacy Policy or the Extension's security practices, please open an issue on the project's official GitHub repository or contact the developer directly.
