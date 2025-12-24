# 🏢 Office Attendance Tracker (iOS + Google Sheets)

A private, automated system to track office attendance milestones (e.g., 40% or 60% targets) using **iOS Shortcuts** and **Google Sheets**.

**Tl;dr**
Only Works for iOS as of now. You just have to say "Hey Siri, Log attendance" and it will give 4 options - Office, Remote, Leave or Check State (Check the percentage of 
your attendance if it is above 12 week window or Quaterly window both). Just follow the Steps below


**Features:**

* **Dual Tracking:** Calculates both "Rolling 12-Week" and "Quarterly" percentages simultaneously.
* **Gap Analysis:** Tells you exactly how many days you need to go to the office to hit your target.
* **Siri Integrated:** "Hey Siri, Log Attendance" -> "Office".
* **Privacy Focused:** Data lives in your own Google Drive.

---

## 🛠️ Step 1: The Google Sheet (Backend)

1. Create a new [Google Sheet](https://sheets.new).
2. **Tab 1 Name:** `Log`
* **Row 1 Headers:** `A1: Date`, `B1: Status`
* **Format:** Select Column A -> Format > Number > Date.


3. **Tab 2 Name:** `Dashboard`
* Create a table with the following Layout & Formulas:



| Cell | Content (Label) | Cell | Formula (Paste these in Column B) |
| --- | --- | --- | --- |
| **A1** | **Metric** | **B1** | **Value** |
| **A2** | **Rolling 12-Wk %** | **B2** | `=IFERROR(COUNTIFS(Log!B:B, "Office", Log!A:A, ">="&TODAY()-84) / COUNTIFS(Log!B:B, "<>Leave", Log!A:A, ">="&TODAY()-84), 0)` |
| **A3** | **Quarterly %** | **B3** | `=IFERROR(COUNTIFS(Log!B:B, "Office", Log!A:A, ">="&DATE(YEAR(TODAY()), FLOOR(MONTH(TODAY())-1, 3)+1, 1)) / COUNTIFS(Log!B:B, "<>Leave", Log!A:A, ">="&DATE(YEAR(TODAY()), FLOOR(MONTH(TODAY())-1, 3)+1, 1)), 0)` |
| **A4** | **Gap to Target** | **B4** | `=MAX(0, CEILING(((0.6 * COUNTIFS(Log!B:B, "<>Leave", Log!A:A, ">="&TODAY()-84)) - COUNTIFS(Log!B:B, "Office", Log!A:A, ">="&TODAY()-84)) / 0.4, 1))` |

> **Note:** The formula in `B4` assumes a **60% (0.6)** target. Change `0.6` to `0.4` if your target is 40%.

---

## ⚡ Step 2: Google Apps Script (The API)

1. In your Sheet, go to **Extensions > Apps Script**.
2. Delete any existing code and paste the code below.
3. **Important:** Change `VALID_SECRET` to a password of your choice.

```javascript
/**
 * @OnlyCurrentDoc
 */

// --- CONFIGURATION ---
var VALID_SECRET = "YourSecurePasswordHere"; 
var TARGET_PERCENT = 0.60; // Set to 0.40 for 40%
// ---------------------

function doGet(e) {
  return ContentService.createTextOutput("System Online. Use POST to log data.");
}

function doPost(e) {
  // 1. SECURITY CHECK
  try {
    var params = JSON.parse(e.postData.contents);
  } catch (error) {
    return ContentService.createTextOutput("Error: Invalid JSON");
  }

  if (params.secret !== VALID_SECRET) {
    return ContentService.createTextOutput("Error: Wrong Secret Key");
  }

  // 2. LOGGING
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
  var status = params.status; 
  
  if (status && status !== "Check") {
    var today = new Date();
    today.setHours(0, 0, 0, 0); // Strip time for clean logs
    sheet.appendRow([today, status]);
  }
  
  // 3. CALCULATIONS
  var dash = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Dashboard");
  SpreadsheetApp.flush(); 
  
  var rolling = dash.getRange("B2").getValue();
  var quarterly = dash.getRange("B3").getValue();
  var gap = dash.getRange("B4").getValue();
  
  // 4. RESPONSE
  var responseText = "";
  if (status === "Check") {
    responseText += "--- Current Stats ---\n";
  } else {
    responseText += "Logged: " + status + "\n";
  }
  
  responseText += "Rolling 12-Wk: " + (rolling * 100).toFixed(1) + "%\n" +
                  "Quarterly: " + (quarterly * 100).toFixed(1) + "%\n";
                     
  if (gap > 0) {
    responseText += "Warning: You need " + gap + " more office days to hit " + (TARGET_PERCENT*100) + "%.";
  } else {
    responseText += "You are safely above " + (TARGET_PERCENT*100) + "%!";
  }
  
  return ContentService.createTextOutput(responseText);
}

```

### Deployment

1. Click **Deploy** (Top Right) > **New Deployment**.
2. **Type:** Web App.
3. **Who has access:** Anyone (Crucial for iOS Shortcuts to work).
4. **Copy the URL** (ends in `/exec`).

---

## 📱 Step 3: iOS Shortcut Setup (Frontend)

Create a new Shortcut with the following actions flow:

1. **Choose from Menu** with options: `Office`, `Remote`, `Leave`, `Check Stats`
2. **CRITICAL STEP:** Inside each menu block, add a **Text** action passing the string value.
* Under `Office` -> Add Text Action: `Office`
* Under `Remote` -> Add Text Action: `Remote`
* Under `Check Stats` -> Add Text Action: `Check`
* *(This ensures the "Menu Result" variable is not empty)*


3. **End Menu**
4. **Get Contents of URL**
* **URL:** Paste your Google Script URL.
* **Method:** POST
* **Request Body:** JSON
* **Add Field 1:** Key: `status` | Value: Select Variable **"Menu Result"**
* **Add Field 2:** Key: `secret` | Value: `YourSecurePasswordHere`


5. **Show Alert**
* Message: Select Variable **"Contents of URL"**



---

## 📝 Usage

* **Via Siri:** "Hey Siri, Log Attendance." -> Respond "Office." -> Siri reads out your stats.
* **Via Tap:** Add the Shortcut to your Home Screen for a one-tap dashboard.
* **Edits:** If you make a mistake (e.g., clicked Office when you were Remote), simply open the Google Sheet on your phone and delete the last row in the `Log` tab.

## 📊 Backfilling Data

If you are starting this mid-year:

1. Open the `Log` tab.
2. Fill in Column A with dates starting from your join date (drag down).
3. Fill in Column B with `Office`, `Remote`, or `Leave`.
4. **Note:** Weekends and Holidays should be marked as `Leave` (or excluded) so they don't lower your percentage.
