const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')

class User extends Model {}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, validate: { len: [2, 100] } },
  collegeId: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, set(value) { this.setDataValue('email', value.toLowerCase().trim()) } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('student', 'faculty', 'admin'), allowNull: false, defaultValue: 'student' },
  isEmailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { sequelize: getSequelize(), modelName: 'User', tableName: 'users', underscored: true, timestamps: true })

module.exports = User
