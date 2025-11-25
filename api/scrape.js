// --- api/scrape.js (OWNERSHIP UPDATE) ---

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
        let insiderOwnText = null; // New
        let instOwnText = null;    // New

        // More robust search for all 4 values
        $('.snapshot-td2').each(function() {
            const label = $(this).text();
            if (label === 'Shs Outstand') shsOutstandText = $(this).next().text();
            if (label === 'Shs Float') shsFloatText = $(this).next().text();
            if (label === 'Insider Own') insiderOwnText = $(this).next().text();
            if (label === 'Inst Own') instOwnText = $(this).next().text();
        });

        if (!shsOutstandText || !shsFloatText) {
             return res.status(404).json({ error: 'Could not find share data on Finviz page.' });
        }
        
        const parseNum = (text) => {
            if (!text) return 0;
            const num = parseFloat(text);
            if (text.endsWith('B')) return num * 1e9;
            if (text.endsWith('M')) return num * 1e6;
            return num;
        };
        
        const sharesOutstanding = parseNum(shsOutstandText);
        const floatShares = parseNum(shsFloatText);
        // Parse percentages, remove the '%' and convert to a decimal (e.g., "10.5%" -> 0.105)
        const insiderOwn = insiderOwnText ? parseFloat(insiderOwnText) / 100 : 0;
        const instOwn = instOwnText ? parseFloat(instOwnText) / 100 : 0;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({
            sharesOutstanding,
            floatShares,
            insiderOwn, // Return new data
            instOwn     // Return new data
        });

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ error: error.message });
    }
};