// --- api/scrape.js (IMPROVED) ---

const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

    try {
        const url = `https://finviz.com/quote.ashx?t=${ticker}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!response.ok) throw new Error('Failed to fetch Finviz page.');

        const html = await response.text();
        const $ = cheerio.load(html);

        let shsOutstandText = null;
        let shsFloatText = null;

        // More robust search: Find the text, then get the value from the next cell
        $('.snapshot-td2').each(function() {
            const label = $(this).text();
            if (label === 'Shs Outstand') {
                shsOutstandText = $(this).next().text();
            }
            if (label === 'Shs Float') {
                shsFloatText = $(this).next().text();
            }
        });

        if (!shsOutstandText || !shsFloatText) {
             return res.status(404).json({ error: 'Could not find share data on Finviz page (Improved Search).' });
        }
        
        const parseNum = (text) => {
            const num = parseFloat(text);
            if (text.endsWith('B')) return num * 1e9;
            if (text.endsWith('M')) return num * 1e6;
            return num;
        };
        
        const sharesOutstanding = parseNum(shsOutstandText);
        const floatShares = parseNum(shsFloatText);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({ sharesOutstanding, floatShares });

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ error: error.message });
    }
};