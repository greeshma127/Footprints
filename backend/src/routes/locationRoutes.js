const express=require("express");
const authMiddleware=require("../middleware/authMiddleware");

const {addLocation, getLocations, getLocationById, updateLocation, deleteLocation,addCityLocation,getCityLocations,deleteCityLocation}=require("../controllers/locationController");

const router=express.Router();

router.post("/",authMiddleware,addLocation);
router.get("/",authMiddleware,getLocations);
router.get("/:id",authMiddleware,getLocationById);
router.post("/:locationId/city-locations",authMiddleware,addCityLocation);
router.get("/:locationId/city-locations",authMiddleware,getCityLocations);
router.delete("/city-locations/:cityLocationId",authMiddleware,deleteCityLocation);
router.put("/:id",authMiddleware,updateLocation);
router.delete("/:id",authMiddleware,deleteLocation);

module.exports=router;