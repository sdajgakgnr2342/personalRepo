const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const vaultAdminController = require('../controllers/vaultAdminController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/recovery-requests', vaultAdminController.listRecoveryRequests);
router.get('/recovery-requests/:id', vaultAdminController.getRecoveryRequest);
router.post('/recovery-requests/:id/approve', vaultAdminController.approveRecoveryRequest);
router.post('/recovery-requests/:id/reject', vaultAdminController.rejectRecoveryRequest);
router.get('/audit-logs', vaultAdminController.listAuditLogs);

module.exports = router;
