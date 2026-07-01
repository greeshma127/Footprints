const pool=require("../config/database");

const getBasicUsers=async()=>{
    const result=await pool.query(
        `
        SELECT
        id,
        name,
        email,
        created_at AS "createdAt",
        0 AS "savedPlaces",
        NULL AS "lastActivityAt"
        FROM users
        ORDER BY created_at DESC`
    );

    return result.rows;
};

const getUsers=async(req,res)=>{
    try{
        const result=await pool.query(
            `
            SELECT
            u.id,
            u.name,
            u.email,
            u.created_at AS "createdAt",
            COUNT(DISTINCT vl.id)::int AS "savedPlaces",
            MAX(vl.updated_at) AS "lastActivityAt"
            FROM users u
            LEFT JOIN visited_locations vl ON vl.user_id=u.id
            GROUP BY u.id,u.name,u.email,u.created_at
            ORDER BY u.created_at DESC`
        );

        return res.status(200).json({
            success:true,
            users:result.rows,
        });
    } catch(error){
        console.error("Get users error:",error);

        if(error.code==="42P01"||error.code==="42703"){
            try{
                const users=await getBasicUsers();

                return res.status(200).json({
                    success:true,
                    users,
                });
            } catch(fallbackError){
                console.error("Get basic users error:",fallbackError);
            }
        }

        return res.status(500).json({
            success:false,
            message:"Failed to fetch users",
        });
    }
};

module.exports={getUsers};
