const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { vaultSessionMiddleware } = require('../middleware/vaultSessionMiddleware');
const vaultController = require('../controllers/vaultController');
const vaultConfig = require('../config/vault');

router.use(authMiddleware);

router.get('/profile', vaultController.getProfileHandler);
router.post('/init', vaultController.initVault);
router.post('/unlock-check', vaultController.unlockCheck);
router.post('/lock', vaultController.lockVault);

router.get('/recovery/bootstrap', vaultController.getRecoveryBootstrap);
router.post('/recovery-request', vaultController.createRecoveryRequest);
router.get('/recovery-request/mine', vaultController.listMyRecoveryRequests);
router.post('/recovery/vmk', vaultController.fetchRecoveryVmk);
router.post('/recovery/complete', vaultController.completeRecoveryPassword);
router.post('/change-password', vaultController.changeVaultPassword);

router.use(vaultSessionMiddleware);

router.get('/files', vaultController.listFiles);
router.post('/files/upload/init', vaultController.initUpload);
router.post(
  '/files/upload/:uploadId/chunk',
  express.raw({ type: 'application/octet-stream', limit: vaultConfig.chunkSize + 65536 }),
  vaultController.uploadChunk
);
router.post('/files/upload/complete', vaultController.completeUpload);
router.get('/files/:id/download', vaultController.getDownloadChunks);
router.get('/files/:id/chunk/:index', vaultController.downloadChunk);
router.delete('/files/:id', vaultController.deleteFile);

module.exports = router;
