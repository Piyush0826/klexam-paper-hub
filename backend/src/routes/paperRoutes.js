const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')
const { deleteOwnPaper, deletePaperFile, downloadHistory, downloadPaper, getMyPapers, searchPapers, uploadPaper, viewPaper } = require('../controllers/paperController')

const router = express.Router()

router.get('/', authMiddleware, searchPapers)
router.get('/downloads/history', authMiddleware, downloadHistory)
router.get('/my', authMiddleware, getMyPapers)
router.post('/upload', authMiddleware, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'files', maxCount: 10 }]), uploadPaper)
router.get('/:id/download', authMiddleware, downloadPaper)
router.delete('/:id/files/:fileIndex', authMiddleware, deletePaperFile)
router.delete('/:id', authMiddleware, deleteOwnPaper)
router.get('/:id', authMiddleware, viewPaper)

module.exports = router
