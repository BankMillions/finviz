// --- api/scrape.js (FINAL EXPANDED VERSION) ---

const cheerio = require('cheerio');

module.exports = async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

    try {
        const url = `https://finviz.com/quote.ashx?t=${ticker}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error('Failed to fetch Finviz page.');

        const html = await response.text();
        const $ = cheerio.load(html);

        let data = {};

        // Loop through all table cells to find labels and values
        $('.snapshot-td2').each(function() {
            const label = $(this).text().trim();
            const value = $(this).next().text().trim();

            switch(label) {
                // Share Structure
                case 'Shs Outstand': data.shsOutstand = value; break;
                case 'Shs Float':    data.shsFloat = value; break;
                case 'Insider Own':  data.insiderOwn = value; break;
                case 'Inst Own':     data.instOwn = value; break;
                
                // Short Data
                case 'Short Float':    data.shortFloat = value; break;
                case 'Short Ratio':    data.shortRatio = value; break;
                case 'Short Interest': data.shortInterest = value; break; // Total shares short
                
                // Volume & Volatility
                case 'Avg Volume':   data.avgVolume = value; break;
                case 'Rel Volume':   data.relVolume = value; break; // Relative Volume
                case 'Volatility':   data.volatility = value; break; // Week/Month Volatility
                case 'ATR (14)':     data.atr = value; break;
                
                // Trend / Techs
                case 'RSI (14)':     data.rsi = value; break;
                case 'SMA20':        data.sma20 = value; break;
                case 'SMA50':        data.sma50 = value; break;
                case 'SMA200':       data.sma200 = value; break;
                
                // Performance
                case 'Perf Week':    data.perfWeek = value; break;
                case 'Perf Month':   data.perfMonth = value; break;
                case 'Perf YTD':     data.perfYtd = value; break;
            }
        });

        if (!data.shsOutstand && !data.shsFloat) {
             return res.status(404).json({ error: 'Could not find core share data.' });
        }
        
        const parseNum = (text) => {
            if (!text || text === '-') return 0;
            // Handle percentages "5.50%" -> 5.5
            if (text.includes('%')) return parseFloat(text.replace('%', ''));
            
            const num = parseFloat(text);
            if (text.endsWith('B')) return num * 1e9;
            if (text.endsWith('M')) return num * 1e6;
            if (text.endsWith('K')) return num * 1e3;
            return num;
        };
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({
            // Structure
            sharesOutstanding: parseNum(data.shsOutstand),
            floatShares: parseNum(data.shsFloat),
            insiderOwn: parseNum(data.insiderOwn) / 100,
            instOwn: parseNum(data.instOwn) / 100,
            
            // Short
            shortFloat: data.shortFloat || '-',
            shortRatio: data.shortRatio || '-',
            shortInterest: data.shortInterest || '-',
            
            // Vol & Tech
            avgVolume: data.avgVolume, // Keep string "2.03M" for easy display, or parse later
            relVolume: data.relVolume || '-',
            volatility: data.volatility || '-',
            rsi: data.rsi || '-',
            sma20: data.sma20 || '-',
            sma50: data.sma50 || '-',
            
            // Performance
            perfWeek: data.perfWeek || '-',
            perfMonth: data.perfMonth || '-'
        });

    } catch (error) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ error: error.message });
    }
};