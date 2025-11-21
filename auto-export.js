/**
 * AUTO-EXPORT SCRIPT
 *
 * Exports all Supabase data to CSV files every hour
 * Can be run via cron job or scheduled task
 *
 * Usage: node auto-export.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase credentials
const SUPABASE_URL = 'https://hmmzxyycqhevfdhybjze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbXp4eXljcWhldmZkaHlianplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMDEwNTMsImV4cCI6MjA3ODU3NzA1M30.iCehxrrebe9YQrZzrDPkSAZ9_yINbRp8Jsnv_zqC4uQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export directory
const EXPORT_DIR = './exports';

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Convert JSON to CSV
 */
function jsonToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        let cell = row[header];
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'object') cell = JSON.stringify(cell).replace(/"/g, '""');
        cell = String(cell).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

/**
 * Export all data from Supabase
 */
async function exportAllData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('Starting export at', new Date().toLocaleString());

  try {
    // Fetch all data
    const [sessions, benchmarks, conversations, annotations, votes] = await Promise.all([
      supabase.from('sessions').select('*'),
      supabase.from('benchmarks').select('*'),
      supabase.from('conversations').select('*'),
      supabase.from('annotations').select('*'),
      supabase.from('votes').select('*'),
    ]);

    const tables = [
      { name: 'sessions', data: sessions.data },
      { name: 'benchmarks', data: benchmarks.data },
      { name: 'conversations', data: conversations.data },
      { name: 'annotations', data: annotations.data },
      { name: 'votes', data: votes.data },
    ];

    // Export each table as CSV
    for (const table of tables) {
      if (table.data && table.data.length > 0) {
        const csv = jsonToCSV(table.data);
        const filename = `${table.name}_${timestamp}.csv`;
        const filepath = path.join(EXPORT_DIR, filename);

        fs.writeFileSync(filepath, csv);
        console.log(`Exported ${table.data.length} rows to ${filename}`);
      } else {
        console.log(`No data in ${table.name} table`);
      }
    }

    // Create combined JSON export
    const combinedData = {
      export_timestamp: new Date().toISOString(),
      total_sessions: sessions.data?.length || 0,
      total_benchmarks: benchmarks.data?.length || 0,
      total_conversations: conversations.data?.length || 0,
      total_annotations: annotations.data?.length || 0,
      total_votes: votes.data?.length || 0,
      data: {
        sessions: sessions.data,
        benchmarks: benchmarks.data,
        conversations: conversations.data,
        annotations: annotations.data,
        votes: votes.data,
      }
    };

    const jsonFilename = `full_export_${timestamp}.json`;
    const jsonFilepath = path.join(EXPORT_DIR, jsonFilename);
    fs.writeFileSync(jsonFilepath, JSON.stringify(combinedData, null, 2));
    console.log(`Created combined JSON export: ${jsonFilename}`);

    console.log('Export completed successfully!');

  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// Run export
exportAllData()
  .then(() => {
    console.log('Auto-export completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auto-export failed:', error);
    process.exit(1);
  });
