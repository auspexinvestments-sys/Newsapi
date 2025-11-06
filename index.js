// This is your entire server: /api/index.js
// We use 'node-fetch' for compatibility.
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  // 1. Get your secret API key from Vercel's "Environment Variables"
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured.' });
  }

  // 2. Re-build the News API URL
  // 'req.url' will be something like "/api/top-headlines?country=us"
  // We need to strip "/api/" from the front and pass the rest to the News API
  const originalPath = req.url.replace('/api/', '');
  const targetUrl = `https://newsapi.org/v2/${originalPath}`;

  try {
    // 3. Call the real News API
    const apiResponse = await fetch(targetUrl, {
      headers: {
        'X-Api-Key': apiKey, // Securely add your key here
      },
    });

    if (!apiResponse.ok) {
      // If the News API had an error, pass it along
      const errorData = await apiResponse.json();
      return res.status(apiResponse.status).json(errorData);
    }

    // 4. Send the News API's response back to your client
    const data = await apiResponse.json();
    
    // Set CORS header to allow your client-side app to access this
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
