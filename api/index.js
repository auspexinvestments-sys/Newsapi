// This is your entire server: /api/index.js (UPDATED FOR EODHD)

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  // Set CORS header to allow all origins from the start
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Identify the requested service path (e.g., '/api/eodhd' or '/api/everything')
  const path = req.url.split('?')[0];

  let apiKey;
  let targetBaseUrl;
  let requestHeaders = {};
  
  // 2. Route based on API Path
  if (path.includes('/api/everything')) {
    // --- NEWS API ROUTE ---
    apiKey = process.env.NEWS_API_KEY;
    targetBaseUrl = 'https://newsapi.org/v2/everything';
    requestHeaders = { 'X-Api-Key': apiKey };
    
  } else if (path.includes('/api/eodhd')) {
    // --- EODHD STOCK API ROUTE ---
    apiKey = process.env.EODHD_API_KEY; // NEW ENVIRONMENT VARIABLE NAME
    targetBaseUrl = 'https://eodhistoricaldata.com/api/eod/'; 
    // EODHD uses the token as a query parameter, not a header
  
  } else {
    return res.status(404).json({ error: 'API route not found. Use /api/everything or /api/eodhd' });
  }

  // Check if the required API key is configured
  if (!apiKey) {
    return res.status(500).json({ error: `${targetBaseUrl} API key not configured on the proxy server.` });
  }

  // 3. Extract parameters (including 'q' for News or 'symbol' for EODHD)
  const queryParams = new URLSearchParams(req.url.split('?')[1]);
  
  let finalTargetUrl;

  if (targetBaseUrl.includes('newsapi')) {
    // News API uses the path, and key is in header
    const originalPath = req.url.replace('/api/', ''); 
    finalTargetUrl = `https://newsapi.org/v2/${originalPath}`;
    
  } else if (targetBaseUrl.includes('eodhistoricaldata')) {
    // EODHD needs symbol, limit, and token in query string
    const symbol = queryParams.get('symbol'); // Extracted from client: ?symbol=TCS.NSE
    
    if (!symbol) {
        return res.status(400).json({ error: 'Missing stock symbol for EODHD request.' });
    }
    
    // Construct the final EODHD request URL
    finalTargetUrl = `${targetBaseUrl}${symbol}?api_token=${apiKey}&fmt=json&period=d&limit=30`;
    
  } else {
    return res.status(500).json({ error: 'Internal routing error.' });
  }

  try {
    // 4. Call the external API
    const apiResponse = await fetch(finalTargetUrl, { headers: requestHeaders });

    if (!apiResponse.ok) {
      // Try to return the external API's error message
      const errorData = await apiResponse.text();
      return res.status(apiResponse.status).json({ error: errorData || 'External API Error' });
    }

    // 5. Send the API's response back to your client
    const data = await apiResponse.json();

    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal Server Error during fetch.' });
  }
}
