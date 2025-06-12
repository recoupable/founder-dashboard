// Simple script to add errors to database
const errors = [
  `❌ Error Alert
From: sam.palm@wmg.com
Room ID: c3441758-9506-4207-b052-a5d93dc9d357
Time: 2025-06-11T21:07:12.321Z

Error Message:
Invalid arguments for tool send_email: Type validation failed: Value: {"from":"Recoup Analytics <hi@recoupable.com>","to":"sam.palm@wmg.com","subject":"PinkPantheress: Fastest Growing TikTok Sounds (Last 7 Days)","html":"<!DOCTYPE html>\\n<html>\\n<head>\\n<style>\\n  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; }\\n  .header { background: linear-gradient(135deg, #ff69b4, #c71585); color: white; padding: 20px; border-radius: 5px 5px 0 0; }\\n  .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }\\n  table { width: 100%; border-collapse: collapse; margin: 20px 0; }\\n  th { background-color: #f9f9f9; text-align: left; padding: 12px; border-bottom: 2px solid #ddd; }\\n  td { padding: 12px; border-bottom: 1px solid #eee; }\\n  .sound-title { font-weight: bold; color: #c71585; }\\n  .metrics { font-weight: bold; color: #333; }\\n  .insights { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }\\n  .action-items { background-color: #fff8e1; padding: 15px; border-radius: 5px; margin: 20px 0; }\\n  .footer { font-size: 12px; color: #999; margin-top: 30px; text-align: center; }\\n</style>\\n</head>\\n<body>\\n  <div class=\\"header\\">\\n    <h1>PinkPantheress TikTok Sound Analysis</h1>\\n    <p>Fastest Growing Sounds | Last 7 Days | June 2025</p>\\n  </div>\\n  \\n  <div class=\\"content\\">\\n    <p>Hi Sam,</p>\\n    \\n    <p>Here's the latest analysis of PinkPantheress's fastest growing TikTok sounds over the past 7 days. The data shows strong performance across both new and catalog tracks, with particularly impressive daily creation rates for \\"Fancy That\\".</p>\\n    \\n    <table>\\n      <tr>\\n        <th>Sound</th>\\n        <th>Daily Creations</th>\\n        <th>Key Driver</th>\\n      </tr>\\n      <tr>\\n        <td><span class=\\"sound-title\\">1. \\"Fancy That\\"</span><br><small>Released: May 9, 2025</small></td>\\n        <td><span class=\\"metrics\\">~3,200-3,800</span><br><small>new videos/day</small></td>\\n        <td>Y2K nostalgic sound + catchy hooks driving virality on For You page</td>\\n      </tr>\\n      <tr>\\n        <td><span class=\\"sound-title\\">2. \\"Tonight\\"</span><br><small>From \\"Fancy That\\" mixtape</small></td>\\n        <td><span class=\\"metrics\\">~1,800-2,200</span><br><small>new videos/day</small></td>\\n        <td>Artist-promoted sound with direct community engagement</td>\\n      </tr>\\n      <tr>\\n        <td><span class=\\"sound-title\\">3. \\"Just For Me\\"</span><br><small>Classic hit</small></td>\\n        <td><span class=\\"metrics\\">~2,800-3,200</span><br><small>new videos/day</small></td>\\n        <td>Perennial favorite, used in aesthetic and nostalgic content</td>\\n      </tr>\\n      <tr>\\n        <td><span class=\\"sound-title\\">4. \\"Boy's a liar Pt. 2\\"</span><br><small>with Ice Spice</small></td>\\n        <td><span class=\\"metrics\\">~1,900-2,300</span><br><small>new videos/day</small></td>\\n        <td>Strong continued performance, cross-audience engagement</td>\\n      </tr>\\n      <tr>\\n        <td><span class=\\"sound-title\\">5. \\"Illegal\\"</span><br><small>Released: April 2025</small></td>\\n        <td><span class=\\"metrics\\">~1,600-1,900</span><br><small>new videos/day</small></td>\\n        <td>Fashion/style content dominating usage after music video release</td>\\n      </tr>\\n    </table>\\n    \\n    <div class=\\"insights\\">\\n      <h3>📊 Key Insights</h3>\\n      <ul>\\n        <li><strong>Multi-generational catalog strength</strong> - Both new and established sounds are performing well simultaneously</li>\\n      ...trimmed

Error Type: AI_InvalidToolArgumentsError

Last Message:
Give me a complete analysis of PinkPantheress's TikTok performance over the last 7 days, including fastest growing sounds and engagement trends`,

  `❌ Error Alert
From: patrick@methodmusic.co.uk
Room ID: 901a2b1e-0a71-4ef9-900b-ee516254dda5
Time: 2025-06-11T20:36:10.101Z

Error Message:
Error executing tool artist_deep_research: API request failed with status 502

Error Type: AI_ToolExecutionError

Stack Trace:
\`\`\`
AI_ToolExecutionError: Error executing tool artist_deep_research: API request failed with status 502
    at /var/task/.next/server/chunks/2587.js:6:56445
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /var/task/.next/server/chunks/2587.js:6:6765
\`\`\`

Last Message:
Disclosure`,

  `❌ Error Alert
From: patrick@methodmusic.co.uk
Room ID: 8c3d4183-d860-448a-bd82-90b79a3b085a
Time: 2025-06-11T17:41:07.162Z

Error Message:
Error executing tool artist_deep_research: API request failed with status 502

Error Type: AI_ToolExecutionError

Stack Trace:
\`\`\`
AI_ToolExecutionError: Error executing tool artist_deep_research: API request failed with status 502
    at /var/task/.next/server/chunks/2587.js:6:56445
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /var/task/.next/server/chunks/2587.js:6:6765
\`\`\`

Last Message:
Ashnikko`,

  `❌ Error Alert
From: sam.palm@wmg.com
Room ID: 743ccb22-4ddb-4f5c-8000-95df1353bcf9
Time: 2025-06-11T15:50:39.630Z

Error Message:
Invalid arguments for tool send_email: Type validation failed: Value: {"from":"hi@recoupable.com","to":"makinghyperpop@gmail.com","cc":"sam.palm@wmg.com","subject":"Ashnikko x MakingHyperpop: Collaboration on Genre-Bending Production?","html":"<p>Hey MakingHyperpop crew,</p>\\n\\n<p>I'm reaching out on behalf of Ashnikko—the blue-haired genre-smasher behind tracks like \\"Daisy\\" and the <i>Weedkiller</i> album—with an idea I think could electrify your community.</p>\\n\\n<p>We've been lurking on your site for a while (those Hyperpop Vocal Chain tutorials are *chef's kiss*) and love how you're nurturing the next wave of boundary-pushing producers. Ashnikko's own sound—that chaotic blend of hyperpop glitches, punk energy, and trap—feels like it belongs in conversation with what your community is building.</p>\\n\\n<p>We'd love to collaborate in one of these ways:</p>\\n\\n<ul>\\n  <li><b>Production Breakdown Session:</b> Ashnikko and her producer could host a video breakdown of how tracks like \\"You Make Me Sick!\\" came together technically—from sound design to vocal processing</li>\\n  <li><b>Guest AMA:</b> An unfiltered Q&A about genre-blending, the technical side of developing a unique vocal identity, and navigating the industry as an alternative artist</li>\\n  <li><b>Co-created Content:</b> A sample pack of Ashnikko vocal chops, producer stems, or one-shots that your community could remix/repurpose (with potential to spotlight the best creations)</li>\\n</ul>\\n\\n<p>The goal isn't a corporate promo—it's connecting with fellow sonic weirdos who get why distorted bass and pitched vocals hit differently. Would any of these ideas resonate with your community?</p>\\n\\n<p>Let me know your thoughts, and we can find a time that works for everyone.</p>\\n\\n<p>Thanks for fostering such a dope space,</p>\\n\\n<p>Team Ashnikko<br>\\n<a href=\\"https://instagram.com/ashnikko\\">@ashnikko</a></p>"}.
Error message: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "string",
    "path": [
      "cc"
    ],
    "message": "Expected array, received string"
  }
]

Error Type: AI_InvalidToolArgumentsError

Stack Trace:
\`\`\`
AI_InvalidToolArgumentsError: Invalid arguments for tool send_email: Type validation failed: Value: {"from":"hi@recoupable.com","to":"makinghyperpop@gmail.com","cc":"sam.palm@wmg.com","subject":"Ashnikko x MakingHyperpop: Collaboration on Genre-Bending Production?","html":"<p>Hey MakingHyperpop crew,</p>\\n\\n<p>I'm reaching out on behalf of Ashnikko—the blue-haired genre-smasher behind tracks like \\"Daisy\\" and the <i>Weedkiller</i> album—with an idea I think could electrify your community.</p>\\n\\n<p>We've been lurking on your site for a while (those Hyperpop Vocal Chain tutorials are *chef's kiss*) and love how you're nurturing the next wave of boundary-pushing producers. Ashnikko's own sound—that chaotic blend of hyperpop glitches, punk energy, and trap—feels like it belongs in conversation with what your community is building.</p>\\n\\n<p>We'd love to collaborate in one of these ways:</p>\\n\\n<ul>\\n  <li><b>Production Breakdown Session:</b> Ashnikko and her producer could host a video breakdown of how tracks like \\"You Make Me Sick!\\" came together technically—from sound design to vocal processing</li>\\n  <li><b>Guest AMA:</b> An unfiltered Q&A about genre-blending, the technical side of developing a unique vocal identity, and navigating the industry as an alternative artist</li>\\n  <li><b>Co-created Content:</b> A sample pack of Ashnikko vocal chops, producer stems, or one-shots that your community could remix/repurpose (with potential to spotlight the best creations)</li>\\n</ul>\\n\\n<p>The goal isn't a corporate promo—it's connecting with fellow s...trimmed
\`\`\`

Last Message:
Find 10 creators in unexpected niches (e.g., glitch fashion, gaming modders, TikTok historians, sports crossovers) who share audience overlap with my brand. For each creator: find their email`,

  `❌ Error Alert
From: sainzmig@gmail.com
Room ID: 646ac053-500f-46a8-a2cf-7c7f9df7c161
Time: 2025-06-11T15:20:36.342Z

Error Message:
Error executing tool artist_deep_research: API request failed with status 502

Error Type: AI_ToolExecutionError

Stack Trace:
\`\`\`
AI_ToolExecutionError: Error executing tool artist_deep_research: API request failed with status 502
    at /var/task/.next/server/chunks/2587.js:6:56445
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /var/task/.next/server/chunks/2587.js:6:6765
\`\`\`

Last Message:
Javi Medina`
];

fetch('http://localhost:3001/api/add-errors-manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rawErrors: errors })
})
.then(res => res.json())
.then(data => console.log('✅ Result:', data))
.catch(err => console.error('❌ Error:', err)); 