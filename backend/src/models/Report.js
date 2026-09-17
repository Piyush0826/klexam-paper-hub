const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')

class Report extends Model {}

Report.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  paperId: { type: DataTypes.UUID, allowNull: false },
  reportedBy: { type: DataTypes.UUID, allowNull: false },
  reason: { type: DataTypes.ENUM('wrong_subject', 'wrong_year', 'wrong_semester', 'duplicate', 'inappropriate', 'other'), allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'reviewed', 'resolved', 'rejected'), allowNull: false, defaultValue: 'pending' },
}, {
  sequelize: getSequelize(),
  modelName: 'Report',
  tableName: 'reports',
  underscored: true,
  timestamps: true,
  indexes: [{ unique: true, fields: ['reported_by', 'paper_id', 'reason'] }, { fields: ['paper_id'] }, { fields: ['status'] }],
})

module.exports = Report
