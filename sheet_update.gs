/**
 * @OnlyCurrentDoc
 */

// --- CONFIGURATION ---
var TARGET_PERCENT = 0.60;  // Update the Percentage according to your preference
// ---------------------

function doGet(e) {
  return ContentService.createTextOutput("System Online. Use POST to log data.");
}

function doPost(e) {
  // 1. PARSE & SECURITY CHECK
  try {
    var params = JSON.parse(e.postData.contents);
  } catch (error) {
    return ContentService.createTextOutput("Error: Invalid JSON");
  }

  // 2. LOGGING
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
  var status = params.status; 
  
  if (status && status !== "Check") {
    var today = new Date();
    // This sets the time to 00:00:00 to keep the cell clean
    today.setHours(0, 0, 0, 0); 
    
    sheet.appendRow([today, status]);
  }
  
  // 3. CALCULATIONS
  var dash = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Dashboard");
  SpreadsheetApp.flush(); // Force update so we get fresh numbers
  
  var rolling = dash.getRange("B2").getValue();
  var quarterly = dash.getRange("B3").getValue();
  var gap = dash.getRange("B4").getValue();
  
  // 4. RESPONSE FORMATTING
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
