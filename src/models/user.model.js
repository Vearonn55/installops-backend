export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    phone: DataTypes.STRING(32),
    role_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'active' },
    last_login_at: DataTypes.DATE
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['role_id'] }]
  });
  User.associate = (db) => {
    User.belongsTo(db.Role, { foreignKey: 'role_id', as: 'role' });
    User.hasMany(db.Installation, { foreignKey: 'created_by', as: 'createdInstallations' });
    User.hasMany(db.Installation, { foreignKey: 'updated_by', as: 'updatedInstallations' });
    User.hasMany(db.CrewAssignment, { foreignKey: 'crew_user_id', as: 'crewAssignments' });
    User.hasMany(db.MediaAsset, { foreignKey: 'created_by', as: 'media' });
  };
  return User;
};
