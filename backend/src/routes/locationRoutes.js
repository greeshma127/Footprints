const express=require("express");
const authMiddleware=require("../middleware/authMiddleware");

const {addLocation, getLocations, getLocationById, updateLocation, deleteLocation,}=require("../controllers/locationController");

const router=express.Router();

router.post("/",authMiddleware,addLocation);
router.get("/",authMiddleware,getLocations);
router.get("/:id",authMiddleware,getLocationById);
router.put("/:id",authMiddleware,updateLocation);
router.delete("/:id",authMiddleware,deleteLocation);

module.exports=router;