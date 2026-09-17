const { Op } = require('sequelize')
const Paper = require('../models/Paper')
const Download = require('../models/Download')
const Report = require('../models/Report')
const User = require('../models/User')
const { uploadPaperFiles, removeCloudinaryFiles } = require('../services/fileService')

async function uploadPaper(request, response) {
  const subject = normalizeSubject(request.body.subject)
  const department = normalizeOptional(request.body.department)
  const semester = normalizeSemester(request.body.semester)
  const year = Number(request.body.year)
  const files = [...(request.files?.file || []), ...(request.files?.files || [])]
  const validationError = validatePaperInput(subject, semester, year, files)

  if (validationError) return response.status(400).json({ success: false, message: validationError })
  if (department && department.length > 100) return response.status(400).json({ success: false, message: 'Department must be 100 characters or fewer' })

  const duplicate = await Paper.findOne({ where: { userId: request.user.id, subjectNormalized: subject, semester, year } })
  if (duplicate) return response.status(409).json({ success: false, message: 'You have already uploaded a paper for this subject, semester, and year' })

  let uploadedFiles = []
  try {
    uploadedFiles = await uploadPaperFiles(files, request.user.id)
    const paper = await Paper.create({
      userId: request.user.id,
      subject,
      subjectNormalized: subject,
      department: department || null,
      semester,
      year,
      fileType: uploadedFiles[0].fileType,
      fileUrl: uploadedFiles.length === 1 ? uploadedFiles[0].url : null,
      cloudinaryPublicId: uploadedFiles.length === 1 ? uploadedFiles[0].publicId : null,
      files: uploadedFiles,
      uploadedAt: new Date(),
    })

    return response.status(201).json({
      success: true,
      message: 'Paper uploaded successfully',
      data: {
        paper: {
          id: paper.id,
          subject: paper.subject,
          department: paper.department,
          semester: paper.semester,
          year: paper.year,
          fileType: paper.fileType,
          files: paper.files,
          uploadedAt: paper.uploadedAt,
          uploader: { id: request.user.id, name: request.user.name, collegeId: request.user.collegeId },
        },
      },
    })
  } catch (error) {
    if (uploadedFiles.length) await removeCloudinaryFiles(uploadedFiles)
    if (error.name === 'SequelizeUniqueConstraintError') return response.status(409).json({ success: false, message: 'You have already uploaded a paper for this subject, semester, and year' })
    console.error(`Paper upload failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Paper upload failed' })
  }
}

async function searchPapers(request, response) {
  const subject = normalizeSearchText(request.query.subject)
  const department = normalizeOptional(request.query.department)
  const semester = normalizeSemester(request.query.semester)
  const semesterProvided = request.query.semester !== undefined && request.query.semester !== ''
  const year = request.query.year === undefined || request.query.year === '' ? undefined : Number(request.query.year)
  const page = request.query.page === undefined ? 1 : Number(request.query.page)
  const limit = request.query.limit === undefined ? 10 : Number(request.query.limit)

  const validationError = validateSearchInput(department, semester, semesterProvided, year, page, limit)
  if (validationError) return response.status(400).json({ success: false, message: validationError })

  const where = {}
  if (subject) where.subjectNormalized = { [Op.like]: `%${escapeLikePattern(subject)}%` }
  if (department) where.department = { [Op.like]: department }
  if (semester) where.semester = semester
  if (year !== undefined) where.year = year

  const result = await Paper.findAndCountAll({
    where,
    attributes: ['id', 'userId', 'subject', 'department', 'semester', 'year', 'fileType', 'files', 'uploadedAt'],
    include: [{ model: User, attributes: ['id', 'name'] }],
    order: [['uploadedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  })

  return response.status(200).json({
    success: true,
    data: {
      papers: result.rows.map((paper) => {
        const availableFiles = getAvailableFiles(paper)
        return {
          id: paper.id,
          userId: paper.userId,
          subject: paper.subject,
          department: paper.department,
          semester: paper.semester,
          year: paper.year,
          fileType: paper.fileType,
          filesCount: availableFiles.length || 1,
          files: availableFiles.map(serializeFileReference),
          uploadedAt: paper.uploadedAt,
          contributor: paper.User ? { id: paper.User.id, name: paper.User.name } : null,
        }
      }),
      pagination: {
        page,
        limit,
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    },
  })
}

async function getMyPapers(request, response) {
  const page = request.query.page === undefined ? 1 : Number(request.query.page)
  const limit = request.query.limit === undefined ? 10 : Number(request.query.limit)
  if (!Number.isInteger(page) || page < 1) return response.status(400).json({ success: false, message: 'Page must be a positive integer' })
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return response.status(400).json({ success: false, message: 'Limit must be between 1 and 50' })

  const result = await Paper.findAndCountAll({
    where: { userId: request.user.id },
    attributes: ['id', 'subject', 'department', 'semester', 'year', 'fileType', 'files', 'uploadedAt'],
    order: [['uploadedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  })

  return response.status(200).json({
    success: true,
    data: {
      papers: result.rows.map((paper) => ({
        id: paper.id,
        subject: paper.subject,
        department: paper.department,
        semester: paper.semester,
        year: paper.year,
        fileType: paper.fileType,
        files: getAvailableFiles(paper).map(serializeFileReference),
        uploadedAt: paper.uploadedAt,
      })),
      pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) },
    },
  })
}

async function deleteOwnPaper(request, response) {
  if (!isValidUuid(request.params.id)) return response.status(404).json({ success: false, message: 'Paper not found' })

  const paper = await Paper.findByPk(request.params.id, { attributes: ['id', 'userId', 'files', 'fileUrl', 'fileType', 'cloudinaryPublicId'] })
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })
  if (paper.userId !== request.user.id && request.user.role !== 'admin') {
    return response.status(403).json({ success: false, message: 'You can delete only your own papers' })
  }

  try {
    await removeCloudinaryFiles(getCloudinaryFiles(paper))
    await Download.destroy({ where: { paperId: paper.id } })
    await Report.destroy({ where: { paperId: paper.id } })
    await Paper.destroy({ where: { id: paper.id } })
    return response.status(200).json({ success: true, message: 'Paper deleted successfully', data: { paperId: paper.id } })
  } catch (error) {
    console.error(`Paper deletion failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Paper could not be deleted safely' })
  }
}

async function deletePaperFile(request, response) {
  if (!isValidUuid(request.params.id)) return response.status(404).json({ success: false, message: 'Paper not found' })

  const paper = await Paper.findByPk(request.params.id)
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })
  if (paper.userId !== request.user.id && request.user.role !== 'admin') {
    return response.status(403).json({ success: false, message: 'You can delete only files from your own papers' })
  }

  const files = Array.isArray(paper.files) ? [...paper.files] : []
  const fileIndex = Number(request.params.fileIndex)

  if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
    return response.status(400).json({ success: false, message: 'Invalid file index' })
  }

  if (files.length <= 1) {
    await removeCloudinaryFiles(getCloudinaryFiles(paper))
    await Download.destroy({ where: { paperId: paper.id } })
    await Report.destroy({ where: { paperId: paper.id } })
    await Paper.destroy({ where: { id: paper.id } })
    return response.status(200).json({
      success: true,
      message: 'Paper deleted as it had only one file',
      data: { paperDeleted: true, paperId: paper.id },
    })
  }

  const [removedFile] = files.splice(fileIndex, 1)
  if (removedFile) {
    await removeCloudinaryFiles([removedFile])
  }

  const updatedFiles = files.map((file, index) => ({ ...file, order: index + 1 }))
  await paper.update({
    files: updatedFiles,
    fileUrl: updatedFiles.length === 1 ? updatedFiles[0].url : null,
    cloudinaryPublicId: updatedFiles.length === 1 ? updatedFiles[0].publicId : null,
  })

  return response.status(200).json({
    success: true,
    message: 'Photo page removed successfully',
    data: {
      paperDeleted: false,
      paperId: paper.id,
      files: updatedFiles.map(serializeFileReference),
    },
  })
}

async function viewPaper(request, response) {
  const paper = await findPaperWithContributor(request.params.id)
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })

  const files = getAvailableFiles(paper)
  if (!files.length) return response.status(404).json({ success: false, message: 'Paper files are unavailable' })

  return response.status(200).json({
    success: true,
    data: {
      paper: {
        id: paper.id,
        userId: paper.userId,
        subject: paper.subject,
        department: paper.department,
        semester: paper.semester,
        year: paper.year,
        fileType: paper.fileType,
        uploadedAt: paper.uploadedAt,
        files: files.map(serializeFileReference),
        contributor: paper.User ? { id: paper.User.id, name: paper.User.name } : null,
      },
    },
  })
}

async function downloadPaper(request, response) {
  const paper = await findPaperWithContributor(request.params.id)
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })

  const files = getAvailableFiles(paper)
  if (!files.length) return response.status(404).json({ success: false, message: 'Paper files are unavailable' })

  await Download.create({ userId: request.user.id, paperId: paper.id, downloadedAt: new Date() })
  return response.status(200).json({
    success: true,
    message: 'Paper download references ready',
    data: {
      paperId: paper.id,
      fileType: paper.fileType,
      downloadUrl: files.length === 1 ? files[0].url : null,
      files: files.map(serializeFileReference),
    },
  })
}

async function downloadHistory(request, response) {
  const page = request.query.page === undefined ? 1 : Number(request.query.page)
  const limit = request.query.limit === undefined ? 10 : Number(request.query.limit)
  if (!Number.isInteger(page) || page < 1) return response.status(400).json({ success: false, message: 'Page must be a positive integer' })
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return response.status(400).json({ success: false, message: 'Limit must be between 1 and 50' })

  const result = await Download.findAndCountAll({
    where: { userId: request.user.id },
    attributes: ['id', 'paperId', 'downloadedAt', 'createdAt'],
    include: [{ model: Paper, attributes: ['id', 'subject', 'department', 'semester', 'year', 'fileType', 'uploadedAt'] }],
    order: [['downloadedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  })

  return response.status(200).json({
    success: true,
    data: {
      downloads: result.rows.map((download) => ({
        id: download.id,
        paperId: download.paperId,
        downloadedAt: download.downloadedAt,
        paper: download.Paper,
      })),
      pagination: { page, limit, totalItems: result.count, totalPages: Math.ceil(result.count / limit) },
    },
  })
}

async function findPaperWithContributor(id) {
  if (!isValidUuid(id)) return null
  return Paper.findByPk(id, {
    attributes: ['id', 'userId', 'subject', 'department', 'semester', 'year', 'fileType', 'fileUrl', 'files', 'uploadedAt'],
    include: [{ model: User, attributes: ['id', 'name'] }],
  })
}

function getAvailableFiles(paper) {
  const storedFiles = Array.isArray(paper.files) ? paper.files : []
  if (storedFiles.length) return storedFiles.filter((file) => file && typeof file.url === 'string' && (file.url.startsWith('http') || file.url.startsWith('/uploads')))
  if (typeof paper.fileUrl === 'string' && (paper.fileUrl.startsWith('http') || paper.fileUrl.startsWith('/uploads'))) return [{ url: paper.fileUrl, originalName: `${paper.subject}.${paper.fileType === 'pdf' ? 'pdf' : 'jpg'}`, fileType: paper.fileType, order: 1 }]
  return []
}

function getCloudinaryFiles(paper) {
  const storedFiles = Array.isArray(paper.files) ? paper.files.filter((file) => file && file.publicId) : []
  if (storedFiles.length) return storedFiles
  if (paper.cloudinaryPublicId) return [{ publicId: paper.cloudinaryPublicId, resourceType: paper.fileType === 'pdf' ? 'raw' : 'image' }]
  return []
}

function serializeFileReference(file) {
  return { url: file.url, originalName: file.originalName, fileType: file.fileType, order: file.order }
}

function isValidUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeSubject(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function normalizeOptional(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function normalizeSearchText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function normalizeSemester(value) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  return normalized === 'odd' ? 'Odd' : normalized === 'even' ? 'Even' : ''
}

function validatePaperInput(subject, semester, year, files) {
  if (!subject) return 'Subject is required'
  if (subject.length > 150) return 'Subject must be 150 characters or fewer'
  if (!['Odd', 'Even'].includes(semester)) return 'Semester must be Odd or Even'
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return 'Year must be a valid year'
  if (!files.length) return 'At least one paper file is required'

  const hasPdf = files.some((file) => file.mimetype === 'application/pdf')
  const hasImage = files.some((file) => file.mimetype.startsWith('image/'))
  if (hasPdf && (hasImage || files.length !== 1)) return 'Upload either one PDF or one or more images, not both'
  return null
}

function validateSearchInput(department, semester, semesterProvided, year, page, limit) {
  if (department.length > 100) return 'Department must be 100 characters or fewer'
  if (semesterProvided && !['Odd', 'Even'].includes(semester)) return 'Semester must be Odd or Even'
  if (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 2100)) return 'Year must be a valid year'
  if (!Number.isInteger(page) || page < 1) return 'Page must be a positive integer'
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return 'Limit must be between 1 and 50'
  return null
}

module.exports = { deleteOwnPaper, deletePaperFile, downloadHistory, downloadPaper, getMyPapers, searchPapers, uploadPaper, viewPaper }
