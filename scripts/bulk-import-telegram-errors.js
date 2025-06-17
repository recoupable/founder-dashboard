#!/usr/bin/env node

/**
 * Bulk import historical Telegram errors
 * 
 * Usage:
 * 1. Copy all error messages from Telegram (last month)
 * 2. Paste them into telegram-errors.txt (one error per block, separated by empty lines)
 * 3. Run: node scripts/bulk-import-telegram-errors.js
 */

const fs = require('fs');
const path = require('path');

async function bulkImportErrors() {
  try {
    console.log('🔍 Looking for telegram-errors.txt...');
    
    const errorFile = path.join(__dirname, '..', 'telegram-errors.txt');
    
    if (!fs.existsSync(errorFile)) {
      console.log('📝 Creating telegram-errors.txt template...');
      
      const template = `# Paste your Telegram errors here, one per block, separated by empty lines
# Example:

❌ Error Alert
From: user@example.com
Room ID: room-123-456
Time: 2025-06-01T10:00:00.000Z

Error Message:
Error executing tool get_spotify_top_tracks: API request failed with status 502

Error Type: AI_ToolExecutionError

Last Message:
Find top tracks for this artist

---

❌ Error Alert
From: another@example.com
Room ID: room-789-012
Time: 2025-06-02T14:30:00.000Z

Error Message:
Rate limit exceeded

Error Type: RateLimitError

Last Message:
Analyze this data

---

# Add more errors above this line...
`;
      
      fs.writeFileSync(errorFile, template);
      
      console.log(`
✅ Created telegram-errors.txt template!

📋 Next steps:
1. Open telegram-errors.txt in a text editor
2. Replace the template with your actual errors from Telegram
3. Run this script again: node scripts/bulk-import-telegram-errors.js

💡 Tips:
- Copy errors from Telegram (go back through your channel history)
- Separate each error with --- or empty lines
- Keep the original format from Telegram
`);
      return;
    }
    
    console.log('📖 Reading telegram-errors.txt...');
    const content = fs.readFileSync(errorFile, 'utf8');
    
    // Split errors by separators
    const errorBlocks = content
      .split(/\n\s*---\s*\n|\n\s*\n\s*❌/)
      .map(block => block.trim())
      .filter(block => 
        block.length > 50 && 
        (block.includes('❌ Error Alert') || block.includes('Error Alert')) &&
        !block.startsWith('#')
      )
      .map(block => block.startsWith('❌') ? block : '❌ ' + block);
    
    if (errorBlocks.length === 0) {
      console.log('❌ No valid errors found in telegram-errors.txt');
      console.log('Make sure you have real error messages (not just the template)');
      return;
    }
    
    console.log(`🚨 Found ${errorBlocks.length} error blocks`);
    
    // Import errors via API
    const response = await fetch('http://localhost:3000/api/add-errors-manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawErrors: errorBlocks
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Successfully imported ${result.insertedCount} errors!`);
      console.log(`⏭️  Skipped ${result.skippedCount} duplicates`);
      
      // Create backup and clear the file
      const backupFile = `telegram-errors-imported-${new Date().toISOString().split('T')[0]}.txt`;
      fs.copyFileSync(errorFile, path.join(__dirname, '..', backupFile));
      console.log(`💾 Backup saved as: ${backupFile}`);
      
      // Clear the file for next use
      fs.writeFileSync(errorFile, '# Ready for more errors...\n\n');
      
    } else {
      console.log('❌ Import failed:', result.error);
      if (result.errors) {
        console.log('Detailed errors:', result.errors);
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  bulkImportErrors();
}

module.exports = { bulkImportErrors }; 