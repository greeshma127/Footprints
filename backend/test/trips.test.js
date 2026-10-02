const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Client} = require('pg');
require('dotenv').config({quiet: true});

test('named trips migration and API behavior (isolated PostgreSQL temporary tables)', {skip: !process.env.DATABASE_URL}, async t => {
    const db = new Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000,
        ssl: process.env.NODE_ENV === 'production' ? {rejectUnauthorized: false} : false});
    await db.connect();
    try {
        await db.query('BEGIN');
        // Exclude public entirely: these tests cannot alter application tables or indexes.
        await db.query('SET LOCAL search_path TO pg_temp, pg_catalog');
        await db.query(`
            CREATE TEMP TABLE users(id UUID PRIMARY KEY DEFAULT gen_random_uuid());
            CREATE TEMP TABLE trips(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),country_name VARCHAR(120) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE UNIQUE INDEX trips_user_country_unique ON trips(user_id,LOWER(country_name));
            CREATE TEMP TABLE visited_locations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id),trip_id UUID NOT NULL REFERENCES trips(id),city TEXT,country TEXT,latitude NUMERIC,longitude NUMERIC,visit_date DATE,notes TEXT,image_url TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TEMP TABLE visited_city_locations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),visited_location_id UUID REFERENCES visited_locations(id) ON DELETE CASCADE,name TEXT,category TEXT,visit_date DATE,time_of_visit TEXT,duration TEXT,review TEXT,photo_url TEXT,latitude NUMERIC,longitude NUMERIC,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        `);
        const owner = (await db.query('INSERT INTO users DEFAULT VALUES RETURNING id')).rows[0].id;
        const stranger = (await db.query('INSERT INTO users DEFAULT VALUES RETURNING id')).rows[0].id;
        const legacy = (await db.query("INSERT INTO trips(user_id,country_name) VALUES($1,'Japan') RETURNING id", [owner])).rows[0].id;
        const oldVisit = (await db.query("INSERT INTO visited_locations(user_id,trip_id,city,country,visit_date) VALUES($1,$2,'Tokyo','Japan','2026-04-05') RETURNING id", [owner,legacy])).rows[0].id;
        await db.query("INSERT INTO visited_city_locations(visited_location_id,visit_date) VALUES($1,'2026-04-07')", [oldVisit]);
        const sql = fs.readFileSync(path.join(__dirname,'../../database/2026-10-02_named_trips.sql'),'utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
        await db.query(sql);

        const adapter = {release() {}, query(sql, values) {
            if (sql === 'BEGIN') return db.query('SAVEPOINT api_request');
            if (sql === 'COMMIT') return db.query('RELEASE SAVEPOINT api_request');
            if (sql === 'ROLLBACK') return db.query('ROLLBACK TO SAVEPOINT api_request');
            return db.query(sql, values);
        }};
        const modulePath = require.resolve('../src/config/database');
        const previous = require.cache[modulePath];
        let pendingQuery = Promise.resolve();
        require.cache[modulePath] = {id: modulePath, filename: modulePath, loaded: true, exports: {
            query: (sql,values) => { pendingQuery = pendingQuery.then(() => db.query(sql,values)); return pendingQuery; }, connect: async () => adapter,
        }};
        t.after(() => { if(previous) require.cache[modulePath]=previous; else delete require.cache[modulePath]; });
        const trips = require('../src/controllers/tripController');
        const places = require('../src/controllers/locationController');
        const call = async (handler, body = {}, params = {}, userId = owner) => {
            const res = {code: 200, status(code) {this.code=code; return this;}, json(body) {this.body=body; return this;}};
            await handler({body,params,user:{id:userId}},res);
            return res;
        };
        const tripBody = {name:'Japan Spring 2026',startDate:'2026-04-01',endDate:'2026-04-30'};
        let first, second, visit;
        await t.test('migration preserves IDs and includes attraction dates in legacy ranges', async () => {
            const res=await call(trips.getTrips);
            assert.deepEqual(res.body.trips,[{id:legacy,name:'Japan memories',startDate:'2026-04-05',endDate:'2026-04-07'}]);
            assert.equal((await db.query('SELECT trip_id FROM visited_locations WHERE id=$1',[oldVisit])).rows[0].trip_id,legacy);
        });
        await t.test('creates independent trips with identical names and overlapping dates', async () => {
            const a=await call(trips.saveTrip,tripBody), b=await call(trips.saveTrip,tripBody);
            assert.equal(a.code,201); assert.equal(b.code,201);
            first=a.body.trip.id; second=b.body.trip.id;
            assert.notEqual(first,second);
        });
        await t.test('rejects blank names, impossible dates, and reversed ranges', async () => {
            for(const change of [{name:' '},{startDate:'2026-02-30'},{endDate:'2026-03-31'}]) {
                assert.equal((await call(trips.saveTrip,{...tripBody,...change})).code,400);
            }
        });
        const placeBody = {city:'Tokyo',country:'Japan',latitude:35,longitude:139,visitDate:'2026-04-05',notes:'Spring visit'};
        await t.test('one trip spans countries; repeat visits can belong to another trip', async () => {
            const a=await call(places.addLocation,{...placeBody,tripId:first});
            const b=await call(places.addLocation,{...placeBody,tripId:first,city:'Seoul',country:'South Korea'});
            const c=await call(places.addLocation,{...placeBody,tripId:second});
            for(const res of [a,b,c]) assert.equal(res.code,201);
            visit=a.body.location.id;
            assert.equal(b.body.location.tripId,first); assert.equal(c.body.location.tripId,second);
        });
        await t.test('ownership applies to listing, editing trips, and adding visits', async () => {
            assert.deepEqual((await call(trips.getTrips,{}, {},stranger)).body.trips,[]);
            assert.equal((await call(trips.saveTrip,tripBody,{id:first},stranger)).code,404);
            assert.equal((await call(places.addLocation,{...placeBody,tripId:first},{},stranger)).code,404);
            assert.equal((await call(places.addLocation,placeBody)).code,400);
        });
        await t.test('rejects out-of-range city and attraction visits', async () => {
            assert.equal((await call(places.addLocation,{...placeBody,tripId:first,visitDate:'2026-05-01'})).code,400);
            const attraction={name:'Temple',category:'Landmark',visitDate:'2026-05-01',timeOfVisit:'10:00',duration:'1 hour',review:'Peaceful'};
            assert.equal((await call(places.addLocation,{...placeBody,tripId:first,cityLocations:[attraction]})).code,400);
            assert.equal((await call(places.addCityLocation,attraction,{locationId:visit})).code,400);
            assert.equal((await call(places.addCityLocation,{...attraction,visitDate:'2026-04-30'},{locationId:visit})).code,201);
        });
        await t.test('trip edits preserve visits and cannot exclude attraction dates', async () => {
            assert.equal((await call(trips.saveTrip,{...tripBody,endDate:'2026-04-29'},{id:first})).code,400);
            const res=await call(trips.saveTrip,{...tripBody,name:'Japan and Korea',endDate:'2026-05-02'},{id:first});
            assert.equal(res.code,200); assert.equal(res.body.trip.name,'Japan and Korea');
        });
        await t.test('reassigns visits explicitly and rejects invalid reassignment without losing data', async () => {
            assert.equal((await call(places.updateLocation,{...placeBody,tripId:legacy,visitDate:'2026-04-20'},{id:visit})).code,400);
            assert.equal((await db.query('SELECT trip_id FROM visited_locations WHERE id=$1',[visit])).rows[0].trip_id,first);
            const res=await call(places.updateLocation,{...placeBody,tripId:second},{id:visit});
            assert.equal(res.code,200); assert.equal(res.body.location.tripId,second);
            const loaded=await call(places.getLocations);
            assert.equal(loaded.code,200);
            assert.equal(loaded.body.locations.find(location=>location.id===visit).tripName,tripBody.name);
        });
    } finally { await db.query('ROLLBACK'); await db.end(); }
});
