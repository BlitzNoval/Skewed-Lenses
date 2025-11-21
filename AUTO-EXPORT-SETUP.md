# Auto-Export Setup Guide

This guide shows you how to automatically export your Supabase data to CSV/Excel every hour.

## ✅ What Gets Exported Every Hour:

1. **sessions.csv** - All user sessions with metadata
2. **benchmarks.csv** - All reading test results with labels
3. **conversations.csv** - All AI debates with tags
4. **annotations.csv** - All bias flags with explanations
5. **votes.csv** - All user votes on bias
6. **full_export.json** - Complete database snapshot

## 📊 All Data is Labeled:

Every record includes:
- `export_label` - Human-readable identifier
- `exported` - Boolean flag (false until exported)
- Timestamps
- AI model names
- Test names
- Bias categories

## ⏰ Option 1: Windows Task Scheduler (Recommended for Windows)

### Step 1: Test the Export Script

```bash
cd /mnt/c/Users/ljmoo/OneDrive/Desktop/Skewed-Lenses
node auto-export.js
```

Check the `./exports` folder - you should see CSV files!

### Step 2: Set Up Hourly Task

1. Open **Task Scheduler** (search in Windows)
2. Click **Create Basic Task**
3. Name: "Skewed Lenses Hourly Export"
4. Trigger: **Daily**
5. Repeat: **Every 1 hour**
6. Action: **Start a program**
   - Program: `node`
   - Arguments: `auto-export.js`
   - Start in: `C:\Users\ljmoo\OneDrive\Desktop\Skewed-Lenses`
7. Click **Finish**

Done! Exports run every hour automatically.

## ⏰ Option 2: Cron Job (Mac/Linux)

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * cd /path/to/Skewed-Lenses && node auto-export.js
```

## ⏰ Option 3: GitHub Actions (Cloud-Based)

Create `.github/workflows/auto-export.yml`:

```yaml
name: Auto Export Data

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install @supabase/supabase-js
      - run: node auto-export.js
      - uses: actions/upload-artifact@v3
        with:
          name: exports
          path: exports/
```

This runs on GitHub's servers - no local computer needed!

## 📁 Where Files Are Saved:

```
Skewed-Lenses/
└── exports/
    ├── sessions_2025-11-21T04-00-00.csv
    ├── benchmarks_2025-11-21T04-00-00.csv
    ├── conversations_2025-11-21T04-00-00.csv
    ├── annotations_2025-11-21T04-00-00.csv
    ├── votes_2025-11-21T04-00-00.csv
    └── full_export_2025-11-21T04-00-00.json
```

## 📧 Optional: Email Exports

Add this to `auto-export.js` to email yourself:

```javascript
// At the top
import nodemailer from 'nodemailer';

// After export completes
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

await transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'your-email@gmail.com',
  subject: 'Skewed Lenses Hourly Export',
  text: `Export completed at ${new Date().toLocaleString()}`,
  attachments: [
    { path: './exports/full_export_latest.json' }
  ]
});
```

## 🔍 Filtering Exported Data:

In Excel/Google Sheets, filter by:
- `export_label` column - e.g., "BENCHMARK_1_ORAL_FLUENCY"
- `benchmark_type` - "oral_fluency" or "typing_pace"
- `model` - "llama" or "gemini"
- `bias_type` - bias categories
- `created_at` - date ranges

## ✅ Summary:

- ✅ All data automatically exported every hour
- ✅ Every record has clear labels and tags
- ✅ CSV files ready for Excel
- ✅ JSON files for programmatic analysis
- ✅ Can filter by test type, AI model, date, etc.
- ✅ No manual work required!

**Your data collection is now fully automated!** 🎉
