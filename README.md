# RoK Betrayal Tracker (Chrome Extension)

**Author:** Eddie (Alliance 15KL, Kingdom 2415)  
**Version:** 1.9  

A lightweight, automated Google Chrome Extension that cross-references active Rise of Kingdoms player/kingdom profiles against a centralized, public database of known KvK agreement violations and betrayals. 

Instead of manually verifying kingdom histories, this extension automatically injects visual alerts and tooltips directly into popular Rise of Kingdoms community statistic web platforms.

---

## 🚀 Features

* **Instant Visual Flags:** Highlights untrustworthy kingdoms with real-time border alerts and warning styling.
* **Contextual Explanations:** Hover over flagged elements to see the official `Type of Betrayal` reason natively inside your browser.
* **Zero Performance Lag:** Downloads and caches the centralized database locally in your browser storage once every 4 hours. Page rendering remains lightning-fast without hammering external network APIs.
* **100% Client-Side:** No login required, no data collection, and completely open-source.

---

## 📊 Supported RoK Platforms

The extension actively listens and injects alert states onto the following community data hubs:
* [Heroscroll](https://heroscroll.com)
* [RoK Stats](https://app.rokstats.online)
* [Pro Kingdoms](https://beta.prokingdoms.com)
* [RoK Metrics](https://rokmetrics.com)
* [StatsMaster DataHub](https://www.statsmasterdatahub.com)

---

## ⚖️ Opt-Out Requests & Compliance Disclaimer

This extension is built purely as a community-driven utility to aggregate public data for the convenience of players. However, we strictly respect the data ownership of third parties and the platform boundaries of website owners.

### 🛑 For Data Owners (TKC, Fleisch)
The database pulled by this extension relies entirely on publicly broadcasted records. If the coordinators, managers, or authorized owners of the TKC/Fleisch registries do not want their public data streams indexed or utilized by this extension, please contact us by opening a **GitHub Issue** or reaching out directly on Discord. We will immediately remove the source endpoint from the code.

### 🌐 For Website Administrators (Heroscroll, RoK Stats, etc.)
We appreciate the incredible tools you have built for the RoK community and have no intention of disrupting your platforms. If you are an administrator or developer for any of the supported statistics websites and you prefer that this extension **does not run** on your domain:
1. Please contact us via a **GitHub Issue** or direct community message.
2. We will immediately strip your domain from the `manifest.json` match arrays in the next deployment.

---

## 🔒 Security & Privacy: Understanding Extension Permissions

When installing any browser extension, it is critical to know exactly which websites it can see and interact with. Many extensions request broad, sweeping permissions (like "Read and change all your data on all websites"), which means they can run in the background while you access sensitive pages like your bank account, personal emails, or password managers. 

This extension is built with a strict **Least Privilege** philosophy. It is hardcoded to be completely blind to 99.9% of the internet.

### 🚫 Restricted Web Access
This extension **cannot** read, log, or interact with any website other than the specific Rise of Kingdoms community platforms listed above. 
* It does **not** track your browsing history.
* It does **not** inject code into Discord, Google Search, or any non-RoK website.
* If you are on any domain not explicitly listed in our configuration, the extension completely idles and executes zero code.

### 🔍 How You Can Verify This Yourself
Because this project is entirely open-source, you do not have to take our word for it. You can verify exactly where this extension is allowed to run in less than 30 seconds:

1. Open the `manifest.json` file in this repository.
2. Locate the `"host_permissions"` and `"matches"` arrays. 
3. You will see that it strictly limits network traffic to:
   * The specific RoK stat sites (like `heroscroll.com` and `rokstats.online`) so it can highlight players on your screen.
   * `https://docs.google.com/*` which is used **strictly in the background** so the extension can download the public database CSV file.

Google Chrome strictly enforces these rules at the browser level. Because `docs.google.com` is not in the `"matches"` array for content scripts, the extension is completely blind and cannot read or touch your screen if you visit your personal Google Docs or Google Drive.

---

## 🛠️ How It Works (Data Architecture)

1. **Centralized Source:** The official dataset is actively managed and updated inside a centralized database.
2. **Public Endpoint:** The database is published to the web as a public CSV stream:  
   `https://docs.google.com/spreadsheets/d/e/2PACX-1vRzdxQXM2KaQOr1tqI6smfQYfCD93CIYDVB-Lh937YV7I6aVUMEPAhi3m_q3bfuZjdmDT4IbPk5rJTM/pub?output=csv`
3. **Background Caching (`background.js`):** Upon installation (and recurring every 4 hours using Chrome Alarms), the extension fetches this CSV file, parses the data rows cleanly, and stores it within `chrome.storage.local`.
4. **DOM Injections (`content.js`):** When you navigate to a supported stats platform, the content script checks the local cache instantly and applies warning overlays via `styles.css`.

---

## 📦 Local Installation Guide (Developer Mode)

Until this extension is published directly to the Chrome Web Store, you can run it locally:

1. **Download the Repository:** Click `Code` -> `Download ZIP` on this GitHub page, and extract it somewhere safe on your computer.
2. **Open Extension Management:** Open Google Chrome and navigate to `chrome://extensions/`.
3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top-right corner of the page.
4. **Load the Unpacked Project:** Click **Load unpacked** in the top-left corner.
5. **Select Folder:** Select the root directory containing your `manifest.json`, `background.js`, and `content.js` files.
6. **Done!** The tracker icon will now appear in your extension tray.

---

## 📁 Repository Structure

```text
├── manifest.json       # Extension configuration, permissions, and host match targets
├── background.js       # Background service worker handling the 4-hour CSV sync/caching
├── content.js          # Injected logic responsible for scraping and highlighting DOM profiles
├── popup.html          # Extension popover UI panel
├── popup.js            # Interactive popup event handlers
└── styles.css          # Injected visual warning indicators and tooltip layouts


