const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', statsController.getStats);
router.get('/tree', statsController.getTree);
router.get('/drafts', statsController.getDrafts);
router.get('/favorites', statsController.getFavorites);
router.get('/trash', statsController.getTrash);

module.exports = router;
