const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')

class Paper extends Model {}

Paper.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  subject: { type: DataTypes.STRING(150), allowNull: false },
  subjectNormalized: { type: DataTypes.STRING(150), allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },
  semester: { type: DataTypes.ENUM('Odd', 'Even'), allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  fileType: { type: DataTypes.ENUM('pdf', 'image'), allowNull: false },
  fileUrl: { type: DataTypes.TEXT, allowNull: true },
  cloudinaryPublicId: { type: DataTypes.STRING(500), allowNull: true },
  files: { type: DataTypes.JSON, allowNull: false },
  uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize: getSequelize(),
  modelName: 'Paper',
  tableName: 'papers',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['user_id', 'subject_normalized', 'semester', 'year'] }],
})

module.exports = Paper
