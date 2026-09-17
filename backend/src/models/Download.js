const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')

class Download extends Model {}

Download.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  paperId: { type: DataTypes.UUID, allowNull: false },
  downloadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize: getSequelize(),
  modelName: 'Download',
  tableName: 'downloads',
  underscored: true,
  timestamps: true,
  indexes: [{ fields: ['user_id'] }, { fields: ['paper_id'] }],
})

module.exports = Download
