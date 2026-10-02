const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const {getTrips, saveTrip} = require('../controllers/tripController');
router.use(auth);
router.get('/', getTrips);
router.post('/', saveTrip);
router.put('/:id', saveTrip);
module.exports = router;
