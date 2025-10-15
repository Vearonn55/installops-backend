export default (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(48), allowNull: false, unique: true },
    permissions: DataTypes.JSONB
  }, {
    tableName: 'roles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Role.associate = (db) => {
    Role.hasMany(db.User, { foreignKey: 'role_id', as: 'users' });
  };
  return Role;
};
