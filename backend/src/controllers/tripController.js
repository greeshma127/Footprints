const pool = require('../config/database');

const tripFields = `id, name, to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(end_date, 'YYYY-MM-DD') AS "endDate"`;
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value.slice(0,4) !== '0000' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const isId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const validateTrip = ({name, startDate, endDate}) => {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 160) return 'Trip name must contain 1–160 characters';
    if (!isDate(startDate) || !isDate(endDate)) return 'Valid start and end dates are required';
    if (endDate < startDate) return 'End date must be on or after start date';
    return null;
};

// Lock the trip while checking and writing visits, so concurrent date edits stay consistent.
const requireTrip = async (client, userId, tripId, dates) => {
    if (!isId(tripId)) throw Object.assign(new Error('Select a valid trip'), {status: 400});
    const result = await client.query(`SELECT ${tripFields} FROM trips WHERE id=$1 AND user_id=$2 FOR UPDATE`, [tripId, userId]);
    const trip = result.rows[0];
    if (!trip) throw Object.assign(new Error('Trip not found'), {status: 404});
    if (dates.some(date => !isDate(date) || date < trip.startDate || date > trip.endDate)) {
        throw Object.assign(new Error('Every visit date must fall within the trip date range'), {status: 400});
    }
    return trip;
};

const getTrips = async (req, res) => {
    try {
        const result = await pool.query(`SELECT ${tripFields} FROM trips WHERE user_id=$1 ORDER BY start_date DESC, created_at DESC`, [req.user.id]);
        res.json({success: true, trips: result.rows});
    } catch (error) { console.error(error); res.status(500).json({message: 'Could not load trips'}); }
};

const saveTrip = async (req, res) => {
    const error = validateTrip(req.body || {});
    if (error) return res.status(400).json({message: error});
    if (req.params.id && !isId(req.params.id)) return res.status(400).json({message: 'Invalid trip ID'});
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const {name, startDate, endDate} = req.body;
        if (req.params.id) {
            await requireTrip(client, req.user.id, req.params.id, []);
            const outside = await client.query(`SELECT 1 FROM visited_locations vl
                WHERE vl.trip_id=$1 AND (vl.visit_date < $2::date OR vl.visit_date > $3::date
                OR EXISTS (SELECT 1 FROM visited_city_locations c WHERE c.visited_location_id=vl.id
                    AND (c.visit_date < $2::date OR c.visit_date > $3::date))) LIMIT 1`, [req.params.id, startDate, endDate]);
            if (outside.rows.length) throw Object.assign(new Error('The date range must include all existing visits'), {status: 400});
        }
        const result = req.params.id
            ? await client.query(`UPDATE trips SET name=$1,start_date=$2,end_date=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND user_id=$5 RETURNING ${tripFields}`, [name.trim(), startDate, endDate, req.params.id, req.user.id])
            : await client.query(`INSERT INTO trips(user_id,name,start_date,end_date) VALUES($1,$2,$3,$4) RETURNING ${tripFields}`, [req.user.id, name.trim(), startDate, endDate]);
        await client.query('COMMIT');
        res.status(req.params.id ? 200 : 201).json({success: true, trip: result.rows[0]});
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        if (!error.status) console.error(error);
        res.status(error.status || 500).json({message: error.status ? error.message : 'Could not save trip'});
    } finally { if (client) client.release(); }
};

module.exports = {getTrips, saveTrip, requireTrip, validateTrip, isDate};
