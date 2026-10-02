const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        const columns = await client.query(`SELECT column_name FROM information_schema.columns
            WHERE table_schema=current_schema() AND table_name='trips'`);
        const names = columns.rows.map(row => row.column_name);
        if (!names.includes('country_name') && ['name','start_date','end_date'].every(name => names.includes(name))) {
            console.log('Named trips migration already applied.');
            return;
        }
        if (!names.includes('country_name')) throw new Error('Apply the initial trips migration before the named trips migration.');
        await client.query(fs.readFileSync(path.join(__dirname,'../../database/2026-10-02_named_trips.sql'),'utf8'));
        console.log('Named trips migration applied; existing trips and visits preserved.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
}

migrate().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
