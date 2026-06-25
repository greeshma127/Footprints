const pool=require("../config/database");

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

const addLocation=async(req,res)=>{
    try{
        const error=validateLocation(req.body);

        if(error){
            return res.status(400).json({
                success:false,
                message:error,
            });
        }

        const {city,country,latitude,longitude,visitDate,notes,imageUrl}=req.body;

        const result=await pool.query(`INSERT INTO visited_locations (user_id,city,country,latitude,longitude,visit_date,notes,image_url)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING id,city,country,latitude,longitude,visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"`,
        [
            req.user.id,
            city,
            country,
            Number(latitude),
            Number(longitude),
            visitDate,
            notes,
            imageUrl||null,
        ]);

        return res.status(201).json({
            success:true,
            message:"Location added successfully",
            location:result.rows[0],
        });
    } catch(error){
        console.error("Add location error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to add location",
        });
    }
};

const getLocations=async(req,res)=>{
    try{
        const result=await pool.query(
            `
            SELECT
            id, city, country, latitude, longitude, visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"
            FROM visited_locations WHERE user_id=$1 ORDER BY visit_date DESC`, [req.user.id]
        );

        return res.status(200).json({
            success:true,
            locations:result.rows,
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
            SELECT id,city,country,latitude,longitude,visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"
            FROM visited_locations WHERE id=$1 AND user_id=$2`, [req.params.id,req.user.id]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"Location not found",
            });
        }

        return res.status(200).json({
            success:true,
            location:result.rows[0],
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
    try{
        const error=validateLocation(req.body);

        if(error){
            return res.status(400).json({
                success:false,
                message:error,
            });
        }

        const {city,country,latitude,longitude,visitDate,notes,imageUrl}=req.body;

        const result=await pool.query(
            `
            UPDATE visited_locations
            SET 
            city=$1,
            country=$2,
            latitude=$3,
            longitude=$4,
            visit_date=$5,
            notes=$6,
            image_url=$7,
            updated_at=CURRENT_TIMESTAMP
            WHERE id=$8 AND user_id=$9
            RETURNING id,city,country,latitude,longitude,visit_date AS "visitDate",notes,image_url AS "imageUrl",created_at AS "createdAt",updated_at AS "updatedAt"`,
            [city,country,Number(latitude),Number(longitude),visitDate,notes,imageUrl||null,req.params.id,req.user.id,]
        );

        if(result.rows.length===0){
            return res.status(404).json({
                success:false,
                message:"Location not found",
            });
        }

        return res.status(200).json({
            success:true,
            message:"Location updated successfully",
            location:result.rows[0],
        });
    } catch(error){
        console.error("Update location error:",error);

        return res.status(500).json({
            success:false,
            message:"Failed to update location",
        });
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

module.exports={addLocation,getLocationById,getLocations,updateLocation,deleteLocation};
