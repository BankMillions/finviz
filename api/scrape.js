// --- api/scrape.js ---

// We need to install 'cheerio' for this to work when we deploy.
// For now, just add the code.
const cheerio = require('cheerio');

// This is the main serverless function handler.
// Vercel (our deployment target) will automatically run this code.
module.exports = async (req, res) => {
    // Get the ticker from the query parameter, e.g., ?ticker=TSLA
    const { ticker } = req.query;

    if (!ticker) {
        return res.status(400).json({ error: 'Ticker parameter is required' });
    }

    try {
        const url = `https://finviz.com/quote.ashx?t=${ticker}`;
        
        // Fetch the HTML from the Finviz page
        const response = await fetch(url, {
            // Finviz blocks default 'fetch' user-agents, so we pretend to be a browser.
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Finviz page. Status: ${response.status}`);
        }

        const html = await response.text();
        
        // Load the HTML into cheerio, which is like jQuery for the server.
        const $ = cheerio.load(html);

        // This is the core scraping logic.
        // We find the table cell that contains "Shs Outstand", then get the *next* cell in the same row.
        const shsOutstandText = $('.snapshot-td2-cp:contains("Shs Outstand")').next().text();
        const shsFloatText = $('.snapshot-td2-cp:contains("Shs Float")').next().text();

        // Finviz data isn't always available.
        if (!shsOutstandText || !shsFloatText) {
             return res.status(404).json({ error: 'Could not find share data on Finviz page.' });
        }
        
        // The numbers are in a format like "1.23B" or "450.5M". We need to convert them.
        const parseFinvizNumber = (text) => {
            if (!text) return null;
            const lastChar = text.slice(-1).toUpperCase();
            const num = parseFloat(text);
            if (lastChar === 'B') return num * 1e9;
            if (lastChar === 'M') return num * 1e6;
            if (lastChar === 'K') return num * 1e3;
            return num;
        };
        
        const sharesOutstanding = parseFinvizNumber(shsOutstandText);
        const floatShares = parseFinvizNumber(shsFloatText);

        // Set CORS headers to allow our app to call this API
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        
        // Send the clean data back to our app.
        res.status(200).json({
            sharesOutstanding,
            floatShares
        });

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ error: error.message });
    }
};