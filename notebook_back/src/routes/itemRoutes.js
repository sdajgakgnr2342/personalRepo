const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const attachmentController = require('../controllers/attachmentController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

router.get('/share/:token', itemController.getSharedNote);
router.get('/attachments/:id/file', optionalAuthMiddleware, attachmentController.downloadAttachment);

router.use(authMiddleware);

router.get('/search', itemController.searchNotes);
router.post('/folders', itemController.createFolder);
router.post('/notes', itemController.createNote);
router.delete('/attachments/:id', attachmentController.deleteAttachment);

router.get('/:id/attachments', attachmentController.listAttachments);
router.post('/:id/attachments', attachmentController.uploadAttachment);
router.get('/:id/encrypted-folders', itemController.getEncryptedFoldersInSubtree);

router.get('/:id', itemController.getItem);
router.put('/:id', itemController.updateItem);
router.post('/:id/save', itemController.saveNote);
router.post('/:id/favorite', itemController.toggleFavorite);
router.post('/:id/unlock', itemController.unlockFolder);
router.post('/:id/share', itemController.shareNote);
router.delete('/:id', itemController.moveToTrash);
router.post('/:id/restore', itemController.restoreItem);
router.delete('/:id/permanent', itemController.permanentDelete);

module.exports = router;
