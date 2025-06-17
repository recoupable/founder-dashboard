# Automatic Error Logging Setup Guide

## 🎯 **Goal**: Make errors automatically sync from Telegram to your dashboard

---

## Option 1: Telegram Webhooks (Recommended) ⚡

**Best for production** - Telegram sends messages directly to your server.

### Steps:

1. **Deploy your code** with the webhook endpoints I just created
2. **Set up the webhook** (replace with your domain):
   ```bash
   curl -X POST "https://your-domain.com/api/setup-telegram-webhook" \
     -H "Content-Type: application/json" \
     -d '{"webhookUrl": "https://your-domain.com/api/telegram-webhook"}'
   ```

3. **Verify it's working**:
   ```bash
   curl "https://your-domain.com/api/setup-telegram-webhook"
   ```

### ✅ **Result**: 
- New errors in Telegram → Automatically sync to dashboard
- No polling needed
- Works with channels/supergroups
- Real-time error capture

---

## Option 2: Direct Error Logging (Most Reliable) 🎯

**Best approach** - Log errors directly from your main application.

### Implementation:

Add this to your main AI app error handler:

```javascript
// When an error occurs in your main app
async function logError(userEmail, roomId, errorMessage, errorType, toolName, lastMessage, stackTrace) {
  try {
    await fetch('https://your-dashboard-domain.com/api/log-error-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        roomId,
        errorMessage,
        errorType,
        toolName,
        lastMessage,
        stackTrace
      })
    })
  } catch (err) {
    console.error('Failed to log error to dashboard:', err)
  }
}

// Example usage
try {
  // Your AI tool execution
} catch (error) {
  await logError(
    'user@example.com',
    'room-123',
    error.message,
    'AI_ToolExecutionError',
    'get_spotify_top_tracks',
    'Find top tracks in Peru',
    error.stack
  )
  
  // Still send to Telegram if you want
  await sendToTelegram(error)
}
```

### ✅ **Result**: 
- **Immediate error logging** (no delays)
- **No dependency** on Telegram API
- **Most reliable** method
- **Structured data** with metadata

---

## Option 3: Manual Sync (Backup Method) 🔧

For critical errors that need immediate attention:

```bash
# Copy error text from Telegram, then:
curl -X POST "http://localhost:3000/api/add-errors-manual" \
  -H "Content-Type: application/json" \
  -d '{"rawErrors": ["❌ Error Alert\nFrom: user@email.com\n..."]}'
```

---

## Quick Setup for Production 🚀

### 1. **Deploy with Webhook Support**
```bash
# Your current changes include webhook endpoints
git push origin sidney/errorfix3
# Deploy to production
```

### 2. **Configure Webhook** (replace YOUR_DOMAIN):
```bash
curl -X POST "https://YOUR_DOMAIN/api/setup-telegram-webhook" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://YOUR_DOMAIN/api/telegram-webhook"}'
```

### 3. **Verify Setup**:
```bash
# Check webhook status
curl "https://YOUR_DOMAIN/api/setup-telegram-webhook"

# Test direct logging
curl -X POST "https://YOUR_DOMAIN/api/log-error-direct" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "test@example.com",
    "roomId": "test-room",
    "errorMessage": "Test error",
    "errorType": "Test"
  }'
```

### 4. **Test Error Flow**:
- Generate an error in your main app
- Check if it appears in dashboard
- Verify error rate updates

---

## API Endpoints Created 🛠️

| Endpoint | Purpose | Method |
|----------|---------|---------|
| `/api/telegram-webhook` | Receives Telegram messages | POST |
| `/api/setup-telegram-webhook` | Configures webhook | POST/GET |
| `/api/log-error-direct` | Direct error logging | POST |
| `/api/add-errors-manual` | Manual error sync | POST |

---

## Recommendations 📋

### **For Immediate Setup** (next 5 minutes):
1. ✅ **Manual sync** critical errors using the API
2. 🔄 **Deploy webhook** endpoints to production

### **For Long-term** (next week):
1. 🎯 **Implement direct logging** in your main application
2. ⚡ **Set up webhooks** as backup
3. 📊 **Monitor error rates** in dashboard

### **Best Practice**:
Use **both direct logging AND webhooks**:
- **Direct logging** for reliable, immediate capture
- **Webhooks** as backup for any missed errors
- **Manual sync** for emergency fixes

---

## Testing 🧪

```bash
# Test webhook setup (after deployment)
curl "https://your-domain.com/api/setup-telegram-webhook"

# Test direct logging
curl -X POST "https://your-domain.com/api/log-error-direct" \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "mariagonzalez@onerpm.com",
    "roomId": "test-room-123",
    "errorMessage": "Error executing tool get_spotify_top_tracks: API request failed with status 502",
    "errorType": "AI_ToolExecutionError",
    "toolName": "get_spotify_top_tracks",
    "lastMessage": "Can you find top tracks in Colombia?"
  }'

# Verify it shows in dashboard
curl "https://your-domain.com/api/error-logs?days=1"
```

---

**You now have multiple reliable ways to automatically capture errors!** 🎉 