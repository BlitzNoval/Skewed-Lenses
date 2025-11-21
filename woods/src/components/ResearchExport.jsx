/**
 * Research Export Dashboard
 *
 * Allows researchers to export collected data as CSV or JSON
 * Shows aggregate statistics and download options
 */

import React, { useState, useEffect } from 'react';
import './ResearchExport.css';
import { getAllDataForExport, getAggregateStats } from '../lib/supabase';

function ResearchExport({ onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const aggregateStats = await getAggregateStats();
    setStats(aggregateStats);
    setLoading(false);
  }

  // Convert JSON to CSV
  function jsonToCSV(data, filename) {
    if (!data || data.length === 0) {
      alert(`No data available for ${filename}`);
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row =>
        headers.map(header => {
          let cell = row[header];

          // Handle null/undefined
          if (cell === null || cell === undefined) return '';

          // Handle objects/arrays (stringify them)
          if (typeof cell === 'object') {
            cell = JSON.stringify(cell).replace(/"/g, '""');
          }

          // Escape quotes and wrap in quotes if contains comma
          cell = String(cell).replace(/"/g, '""');
          return `"${cell}"`;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  // Download file
  function downloadFile(content, filename, type = 'text/csv') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export handlers
  async function exportAllDataAsJSON() {
    setExportLoading(true);
    try {
      const data = await getAllDataForExport(10000); // Get up to 10k records
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `skewed-lenses-data-${timestamp}.json`;

      downloadFile(
        JSON.stringify(data, null, 2),
        filename,
        'application/json'
      );
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Check console for details.');
    }
    setExportLoading(false);
  }

  async function exportTableAsCSV(tableName) {
    setExportLoading(true);
    try {
      const data = await getAllDataForExport(10000);
      const tableData = data[tableName];

      if (!tableData || tableData.length === 0) {
        alert(`No data available for ${tableName}`);
        setExportLoading(false);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const csv = jsonToCSV(tableData, tableName);
      const filename = `${tableName}-${timestamp}.csv`;

      downloadFile(csv, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Check console for details.');
    }
    setExportLoading(false);
  }

  if (loading) {
    return (
      <div className="research-export">
        <div className="research-export-container">
          <div className="loading-spinner">Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="research-export">
      <div className="research-export-container">
        <header className="research-header">
          <h1>Research Data Export</h1>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* Export Options */}
        <section className="export-section">
          <div className="export-option">
            <h3>Full Database Export (JSON)</h3>
            <p>Download all data from all tables in JSON format</p>
            <button
              className="export-btn primary"
              onClick={exportAllDataAsJSON}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting...' : 'Download All Data (JSON)'}
            </button>
          </div>

          <div className="export-divider"></div>

          <h3>Individual Tables (CSV)</h3>
          <p>Download specific tables as CSV files</p>

          <div className="export-grid">
            <div className="export-card">
              <h4>Sessions</h4>
              <p>Anonymous user session data</p>
              <button
                className="export-btn secondary"
                onClick={() => exportTableAsCSV('sessions')}
                disabled={exportLoading}
              >
                Download CSV
              </button>
            </div>

            <div className="export-card">
              <h4>Benchmarks</h4>
              <p>Reading fluency and typing pace results</p>
              <button
                className="export-btn secondary"
                onClick={() => exportTableAsCSV('benchmarks')}
                disabled={exportLoading}
              >
                Download CSV
              </button>
            </div>

            <div className="export-card">
              <h4>Conversations</h4>
              <p>AI debate transcripts</p>
              <button
                className="export-btn secondary"
                onClick={() => exportTableAsCSV('conversations')}
                disabled={exportLoading}
              >
                Download CSV
              </button>
            </div>

            <div className="export-card">
              <h4>Annotations</h4>
              <p>AI-generated bias flags</p>
              <button
                className="export-btn secondary"
                onClick={() => exportTableAsCSV('annotations')}
                disabled={exportLoading}
              >
                Download CSV
              </button>
            </div>

            <div className="export-card">
              <h4>Votes</h4>
              <p>User votes on bias validity</p>
              <button
                className="export-btn secondary"
                onClick={() => exportTableAsCSV('votes')}
                disabled={exportLoading}
              >
                Download CSV
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResearchExport;
