const pool=require("../config/database");
const {requireTrip}=require("./tripController");

const validateLocation=(body)=>{
    const {city,country,latitude,longitude,visitDate,notes}=body;

    if(!city||!country||latitude===undefined||latitude===null||latitude===""||longitude===undefined||longitude===null||longitude===""||!visitDate||!notes){
        return "City, country, latitude, longitude, visit date and notes are required";
    }

    const lat=Number(latitude);
    const lng=Number(longitude);

    if(!Number.isFinite(lat)||lat<-90||lat>90){
        return "Latitude must be between -90 and 90";
    }

    if(!Number.isFinite(lng)||lng<-180||lng>180){
        return "Longitude must be between -180 and 180";
    }

    return null;
};

const validateCityLocation=(body)=>{
    const {name,category,visitDate,timeOfVisit,duration,review,latitude,longitude}=body;

    if(!name||!category||!visitDate||!timeOfVisit||!duration||!review){
        return "Name,category,visit date,time of visit,duration and review are required";
    }

    if(latitude!==undefined&&latitude!==null&&latitude!==""){
        const lat=Number(latitude);

        if(!Number.isFinite(lat)||lat<-90||lat>90){
            return "City location latitude must be between -90 and 90";
        }
    }

    if(longitude!==undefined&&longitude!==null&&longitude!==""){
        const lng=Number(longitude);

        if(!Number.isFinite(lng)||lng<-180||lng>180){
            return "City location longitude must be between -180 and 180";
        }
    }

    return null;
};

const validateCityLocations=(cityLocations=[])=>{
    if(!Array.isArray(cityLocations)){
        return "City locations must be an array";
    }

    for(const cityLocation of cityLocations){
        const error=validateCityLocation(cityLocation);

        if(error){
            return error;
        }
    }

    return null;
};

const normalizeOptionalCoordinate=(value)=>{
    if(value===undefined||value===null||value===""){
        return null;
    }

    return Number(value);
};

const insertCityLocations=async(client,locationId,cityLocations=[])=>{
    const insertedCityLocations=[];

    for(const cityLocation of cityLocations){
        const {name,category,visitDate,timeOfVisit,duration,review,photoUrl,latitude,longitude}=cityLocation;

        const result=await client.query(
            `
            INSERT INTO visited_city_locations
            (visited_location_id,name,category,visit_date,time_of_visit,duration,review,photo_url,latitude,longitude)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING id,visited_location_id AS "visitedLocationId",name,category,visit_date AS "visitDate",time_of_visit AS "timeOfVisit",duration,review,photo_url AS "photoUrl",latitude,longitude,created_at AS "createdAt",updated_at AS "updatedAt"`,
            [
                locationId,
                name,
                category,
                visitDate,
                timeOfVisit,
                duration,
                review,
                photoUrl||null,
                normalizeOptionalCoordinate(latitude),
                normalizeOptionalCoordinate(longitude),
            ]
        );

        insertedCityLocations.push(result.rows[0]);
    }

    return insertedCityLocations;
};

const getCityLocationsForLocation=async(locationId)=>{
    const result=await pool.query(
        `
        SELECT id,visited_location_id AS "visitedLocationId",name,category,visit_date AS "visitDate",time_of_visit AS "timeOfVisit",duration,review,photo_url AS "photoUrl",latitude,longitude,created_at AS "createdAt",updated_at AS "updatedAt"
        FROM visited_city_locations
        WHERE visited_location_id=$1
        ORDER BY visit_date ASC,time_of_visit ASC`,
        [locationId]
    );

    return result.rows;
};

const attachCityLocations=async(locations)=>{
    return Promise.all(
        locations.map(async(location)=>({
            ...location,
            cityLocations:await getCityLocationsForLocation(location.id),
        }))
    );
};

const addLocation=async(req,res)=>{
    const client=await pool.connect();

    try{
        const error=validateLocation(req.body);

        if(error){
            return res.status(400).json({
                success:false,
                message:error,
            });
        }

        const cityLocationsError=validateCityLocations(req.body.cityLocations||[]);

        if(cityLocationsError){
            return res.status(400).json({
                success:false,
                message:cityLocationsError,
            });
        }

        const {city,country,latitude,longitude,visitDate,notes,imageUrl,cityLocations=[]}=req.body;

        await client.query("BEGIN");

        const trip=await requireTrip(client,req.user.id,req.body.tripId,[visitDate,...cityLocations.map(location=>location.visitDate)]);

        const result=await client.query(`INSERT INTO visited_locations (user_id,trip_id,city,country,latitude,longitude,visit_date,notes,image_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING id,trip_id AS "tripId",city,country,latitude,longitude,visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"`,
        [
            req.user.id,
            trip.id,
            city,
            country,
            Number(latitude),
            Number(longitude),
            visitDate,
            notes,
            imageUrl||null,
        ]);

        const insertedCityLocations=await insertCityLocations(client,result.rows[0].id,cityLocations);

        await client.query("COMMIT");

        return res.status(201).json({
            success:true,
            message:"Location added successfully",
            location:{
                ...result.rows[0],
                trip,
                cityLocations:insertedCityLocations,
            },
        });
    } catch(error){
        await client.query("ROLLBACK");
        if (!error.status) console.error("Add location error:",error);

        return res.status(error.status || 500).json({
            success:false,
            message:error.status ? error.message : "Failed to add location",
        });
    } finally {
        client.release();
    }
};

const getLocations=async(req,res)=>{
    try{
        const result=await pool.query(
            `
            SELECT
            vl.id, vl.trip_id AS "tripId", vl.city, vl.country, vl.latitude, vl.longitude, vl.visit_date AS "visitDate",vl.notes,vl.image_url AS "imageUrl",vl.created_at AS "createdAt",vl.updated_at AS "updatedAt",
            t.name AS "tripName", to_char(t.start_date, 'YYYY-MM-DD') AS "tripStartDate", to_char(t.end_date, 'YYYY-MM-DD') AS "tripEndDate"
            FROM visited_locations vl
            LEFT JOIN trips t ON t.id=vl.trip_id
            WHERE vl.user_id=$1
            ORDER BY vl.visit_date DESC`, [req.user.id]
        );

        const locations=await attachCityLocations(result.rows);

        return res.status(200).json({
            success:true,
            locations,
        });
    } catch(error){
        console.error("Get locations error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to fetch locations",
        });
    }
};

const getLocationById=async(req,res)=>{
    try{
        const result=await pool.query(
            `
            SELECT vl.id,vl.trip_id AS "tripId",vl.city,vl.country,vl.latitude,vl.longitude,vl.visit_date AS "visitDate",vl.notes,vl.image_url AS "imageUrl",vl.created_at AS "createdAt",vl.updated_at AS "updatedAt",
            t.name AS "tripName", to_char(t.start_date, 'YYYY-MM-DD') AS "tripStartDate", to_char(t.end_date, 'YYYY-MM-DD') AS "tripEndDate"
            FROM visited_locations vl
            LEFT JOIN trips t ON t.id=vl.trip_id
            WHERE vl.id=$1 AND vl.user_id=$2`, [req.params.id,req.user.id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"Location not found",
            });
        }

        const cityLocations=await getCityLocationsForLocation(result.rows[0].id);

        return res.status(200).json({
            success:true,
            location:{
                ...result.rows[0],
                cityLocations,
            },
        });
    } catch(error){
        console.error("Get location error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to fetch location",
        });
    }
};

const updateLocation=async(req,res)=>{
    const client=await pool.connect();

    try{
        const error=validateLocation(req.body);

        if(error){
            return res.status(400).json({
                success:false,
                message:error,
            });
        }

        const cityLocationsError=validateCityLocations(req.body.cityLocations||[]);

        if(cityLocationsError){
            return res.status(400).json({
                success:false,
                message:cityLocationsError,
            });
        }

        const {city,country,latitude,longitude,visitDate,notes,imageUrl,cityLocations=[]}=req.body;

        await client.query("BEGIN");
        const ownedLocation=await client.query('SELECT id FROM visited_locations WHERE id=$1 AND user_id=$2 FOR UPDATE',[req.params.id,req.user.id]);
        if (!ownedLocation.rows.length) throw Object.assign(new Error('Location not found'), {status:404});

        const trip=await requireTrip(client,req.user.id,req.body.tripId,[visitDate,...cityLocations.map(location=>location.visitDate)]);

        const result=await client.query(
            `
            UPDATE visited_locations
            SET 
            trip_id=$1,
            city=$2,
            country=$3,
            latitude=$4,
            longitude=$5,
            visit_date=$6,
            notes=$7,
            image_url=$8,
            updated_at=CURRENT_TIMESTAMP
            WHERE id=$9 AND user_id=$10
            RETURNING id,trip_id AS "tripId",city,country,latitude,longitude,visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"`,
            [trip.id,city,country,Number(latitude),Number(longitude),visitDate,notes,imageUrl||null,req.params.id,req.user.id,]
        );

        if(result.rows.length===0){
            await client.query("ROLLBACK");
            return res.status(404).json({
                success:false,
                message:"Location not found",
            });
        }

        await client.query(
            `DELETE FROM visited_city_locations WHERE visited_location_id=$1`,
            [req.params.id]
        );

        const insertedCityLocations=await insertCityLocations(client,req.params.id,cityLocations);

        await client.query("COMMIT");

        return res.status(200).json({
            success:true,
            message:"Location updated successfully",
            location:{
                ...result.rows[0],
                trip,
                cityLocations:insertedCityLocations,
            },
        });
    } catch(error){
        await client.query("ROLLBACK");
        if (!error.status) console.error("Update location error:",error);

        return res.status(error.status || 500).json({
            success:false,
            message:error.status ? error.message : "Failed to update location",
        });
    } finally {
        client.release();
    }
};

const deleteLocation=async(req,res)=>{
    try{
        const result=await pool.query(
            `DELETE FROM visited_locations WHERE id=$1 AND user_id=$2 RETURNING id`,
            [req.params.id,req.user.id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"Location not found",
            });
        }

        return res.status(200).json({
            success:true,
            message:"Location deleted successfully",
        });
    } catch(error){
        console.error("Delete location error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to delete location",
        });
    }
};

const addCityLocation=async(req,res)=>{
    let client;
    try {
        const error=validateCityLocation(req.body);
        if(error) return res.status(400).json({success:false,message:error});
        client=await pool.connect();
        await client.query('BEGIN');
        const city=await client.query('SELECT trip_id FROM visited_locations WHERE id=$1 AND user_id=$2 FOR UPDATE',[req.params.locationId,req.user.id]);
        if(!city.rows.length) throw Object.assign(new Error('Visited city not found'),{status:404});
        await requireTrip(client,req.user.id,city.rows[0].trip_id,[req.body.visitDate]);
        const locations=await insertCityLocations(client,req.params.locationId,[req.body]);
        await client.query('COMMIT');
        return res.status(201).json({success:true,cityLocation:locations[0]});
    } catch(error) {
        if(client) await client.query('ROLLBACK');
        if (!error.status) console.error('Add city location error:',error);
        return res.status(error.status || 500).json({success:false,message:error.status ? error.message : 'Failed to add city location'});
    } finally { if(client) client.release(); }
};

const getCityLocations=async(req,res)=>{
    try{
        const cityCheck=await pool.query(
            `SELECT id FROM visited_locations WHERE id=$1 AND user_id=$2`,
            [req.params.locationId,req.user.id]
        );

        if(cityCheck.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"Visited city not found",
            });
        }

        const result=await pool.query(
            `
            SELECT id,visited_location_id AS "visitedLocationId",name,category,visit_date AS "visitDate",time_of_visit AS "timeOfVisit",duration,review,photo_url AS "photoUrl",latitude,longitude,created_at AS "createdAt",updated_at AS "updatedAt"
            FROM visited_city_locations WHERE visited_location_id=$1 ORDER BY visit_date ASC,time_of_visit ASC`,
            [req.params.locationId]
        );

        return res.status(200).json({
            success:true,
            cityLocations:result.rows,
        });
    } catch(error) {
        console.error("Get city locations error:",error);

        return res.status(500).json({
            success:true,
            message:"Failed to fetch city locations",
        });
    }
};

const deleteCityLocation=async(req,res)=>{
    try{
        const result=await pool.query(
            `
            DELETE FROM visited_city_locations vcl
            USING visited_locations vl
            WHERE vcl.id=$1
            AND vcl.visited_location_id=vl.id
            AND vl.user_id=$2
            RETURNING vcl.id
            `,
            [req.params.cityLocationId,req.user.id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"City location not found",
            });
        }

        return res.status(200).json({
            success:true,
            message:"City location deleted successfully",
        });
    } catch(error) {
        console.error("Delete city location error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to delete city location",
        });
    }
};

module.exports={addLocation,getLocationById,getLocations,updateLocation,deleteLocation,addCityLocation,getCityLocations,deleteCityLocation};
