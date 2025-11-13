// Supabase REST API client for Vercel serverless functions
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
}

// Helper to make Supabase REST API calls
async function supabaseQuery(table, options = {}) {
  const { method = 'GET', body, select, eq, order, limit, single } = options;

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': single ? 'return=representation,count=exact' : 'return=representation'
  };

  // Build query params
  const params = new URLSearchParams();
  if (select) params.append('select', select);
  if (eq) {
    Object.entries(eq).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
  }
  if (order) params.append('order', order);
  if (limit) params.append('limit', limit);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }

  const data = await response.json();
  return single ? data[0] : data;
}

// Insert data
export async function insert(table, data) {
  return supabaseQuery(table, {
    method: 'POST',
    body: Array.isArray(data) ? data : [data],
    single: !Array.isArray(data)
  });
}

// Select data
export async function select(table, options = {}) {
  return supabaseQuery(table, {
    method: 'GET',
    ...options
  });
}

// Update data
export async function update(table, id, data) {
  return supabaseQuery(table, {
    method: 'PATCH',
    body: data,
    eq: { id },
    single: true
  });
}

// Upsert (insert or update)
export async function upsert(table, data, conflictColumns) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': `resolution=merge-duplicates,return=representation`
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(Array.isArray(data) ? data : [data])
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase upsert error: ${error}`);
  }

  const result = await response.json();
  return Array.isArray(data) ? result : result[0];
}

// RPC call (for complex queries)
export async function rpc(functionName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase RPC error: ${error}`);
  }

  return response.json();
}
