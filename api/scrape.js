// --- api/scrape.js (FINAL VERSION with SHORT DATA) ---

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

        let data = {};

        // Robust search to find all key-value pairs in the table
        $('.snapshot-td2').each(function() {
            const label = $(this).text();
            const value = $(this).next().text();

            if (label === 'Shs Outstand') data.shsOutstand = value;
            if (label === 'Shs Float') data.shsFloat = value;
            if (label === 'Insider Own') data.insiderOwn = value;
            if (label === 'Inst Own') data.instOwn = value;
            if (label === 'Short Float') data.shortFloat = value; // New
            if (label === 'Short Ratio') data.shortRatio = value; // New
        });

        if (!data.shsOutstand || !data.shsFloat) {
             return res.status(404).json({ error: 'Could not find core share data.' });
        }
        
        const parseNum = (text) => {
            if (!text || text === '-') return 0;
            const num = parseFloat(text);
            if (text.endsWith('B')) return num * 1e9;
            if (text.endsWith('M')) return num * 1e6;
            return num;
        };
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({
            sharesOutstanding: parseNum(data.shsOutstand),
            floatShares: parseNum(data.shsFloat),
            insiderOwn: parseNum(data.insiderOwn) / 100,
            instOwn: parseNum(data.instOwn) / 100,
            shortFloat: data.shortFloat || 'N/A', // Return as string
            shortRatio: data.shortRatio || 'N/A'  // Return as string
        });

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ error: error.message });
    }
};