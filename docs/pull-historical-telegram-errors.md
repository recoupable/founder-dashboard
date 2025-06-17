# Pull All Historical Telegram Errors (Last Month)

## 🎯 **Goal**: Capture all errors from the past month to get accurate error rates

---

## ⚠️ **The Telegram API Challenge**

**Why automatic sync is limited:**
- Telegram's `getUpdates` only returns ~100-200 recent updates
- Doesn't work reliably with channels/supergroups for historical data
- Bot needs to actively receive messages to capture them

**But we have solutions!** 👇

---

## **Method 1: Bulk Import Script** 🚀 (Recommended)

**Best for**: Importing 10-100+ historical errors quickly

### Steps:

1. **Run the bulk import script:**
   ```bash
   node scripts/bulk-import-telegram-errors.js
   ```
   
2. **This creates `telegram-errors.txt`** - a template file

3. **Copy errors from Telegram:**
   - Go to your Telegram error channel
   - Scroll back through the last month
   - Copy error messages (select all text from each error alert)
   - Paste into `telegram-errors.txt`

4. **Format in the file:**
   ```
   ❌ Error Alert
   From: mariagonzalez@onerpm.com
   Room ID: bbc7ad01-5e06-4865-92d7-4cc15deeb8c7
   Time: 2025-06-16T18:58:53.406Z
   
   Error Message:
   Error executing tool get_spotify_artist_top_tracks: API request failed with status 502
   
   ---
   
   ❌ Error Alert
   From: another@example.com
   ...
   
   ---
   ```

5. **Run import:**
   ```bash
   node scripts/bulk-import-telegram-errors.js
   ```

### ✅ **Result**: 
- Parses and imports all errors
- Shows statistics and breakdowns
- Handles duplicates automatically
- Creates backup files

---

## **Method 2: Enhanced API Import** ⚡

**Best for**: Large volumes (100+ errors) with advanced features

### API Endpoint:
```bash
curl -X POST "http://localhost:3000/api/import-historical-errors" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "telegram",
    "errors": [
      "❌ Error Alert\nFrom: user1@example.com\nRoom ID: room-123\nTime: 2025-06-01T10:00:00Z\n\nError Message:\nTool failed\n\nError Type: AI_ToolExecutionError",
      "❌ Error Alert\nFrom: user2@example.com\nRoom ID: room-456\nTime: 2025-06-02T11:00:00Z\n\nError Message:\nAPI timeout\n\nError Type: TimeoutError"
    ],
    "dateRange": {
      "start": "2025-05-17",
      "end": "2025-06-17"
    },
    "overwriteDuplicates": false
  }'
```

### ✅ **Features**:
- **Enhanced parsing** - handles multiple error formats
- **Smart deduplication** - prevents duplicates
- **Statistics** - tool breakdown, user breakdown, date ranges
- **Batch processing** - handles large volumes efficiently
- **Error validation** - reports parsing issues

---

## **Method 3: Manual One-by-One** 🔧

**Best for**: A few critical errors

```bash
# Copy individual error from Telegram, then:
curl -X POST "http://localhost:3000/api/add-errors-manual" \
  -H "Content-Type: application/json" \
  -d '{
    "rawErrors": [
      "❌ Error Alert\nFrom: mariagonzalez@onerpm.com\nRoom ID: bbc7ad01-5e06-4865-92d7-4cc15deeb8c7\nTime: 2025-06-16T18:58:53.406Z\n\nError Message:\nError executing tool get_spotify_artist_top_tracks: API request failed with status 502\n\nError Type: AI_ToolExecutionError\n\nLast Message:\nCan you find top tracks in Peru?"
    ]
  }'
```

---

## **🚀 Quick Start: Get Last Month's Errors**

### **Option A: Using Bulk Script** (5 minutes)

```bash
# 1. Create template
node scripts/bulk-import-telegram-errors.js

# 2. Edit telegram-errors.txt with your errors
# (copy/paste from Telegram channel)

# 3. Import
node scripts/bulk-import-telegram-errors.js
```

### **Option B: Using Enhanced API** (for developers)

```bash
# Test the API first
curl "http://localhost:3000/api/import-historical-errors"

# Then use with your error data
curl -X POST "http://localhost:3000/api/import-historical-errors" \
  -H "Content-Type: application/json" \
  -d '{"source": "telegram", "errors": ["YOUR_ERROR_MESSAGES_HERE"]}'
```

---

## **📊 Verify Your Import**

After importing, check your dashboard:

```bash
# Check total error count
curl "http://localhost:3000/api/error-logs?days=30" | grep '"totalErrors"'

# Check error breakdown by tool
curl "http://localhost:3000/api/error-logs?days=30" | grep '"errorBreakdown"'

# Check in dashboard UI
# - Error rate should now show realistic percentage
# - Tool breakdown should show historical data
```

---

## **💡 Pro Tips**

### **For Large Volumes (100+ errors):**
1. **Use Method 2** (Enhanced API) 
2. **Split into batches** of 50-100 errors
3. **Set date ranges** for better organization

### **For Quick Recovery:**
1. **Use Method 1** (Bulk Script)
2. **Copy errors in chronological order** 
3. **Let the script handle parsing**

### **For Ongoing Capture:**
1. **Set up webhooks** (from our previous work)
2. **Use direct logging** in your main app
3. **Manual sync** for missed errors

---

## **📈 Expected Results**

After importing historical errors:

- **Error rate** will show realistic percentage (not 0%)
- **Tool breakdown** will show which tools fail most
- **User patterns** will be visible in analytics
- **Time trends** will show error frequency over time

---

## **🔍 Example: Import Last Month**

1. **Go to your Telegram channel**
2. **Scroll back to May 17, 2025**
3. **Copy all error alerts from then to now**
4. **Run:** `node scripts/bulk-import-telegram-errors.js`
5. **Paste errors into the file**
6. **Run the script again**
7. **Check dashboard** - you should see historical data!

---

**You now have multiple ways to capture all your historical Telegram errors!** 🎉

Choose the method that works best for your volume and technical comfort level. 