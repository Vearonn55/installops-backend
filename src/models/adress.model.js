export default (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    line1: { type: DataTypes.STRING(180), allowNull: false },
    line2: DataTypes.STRING(180),
    city: DataTypes.STRING(120),
    region: DataTypes.STRING(120),
    postal_code: DataTypes.STRING(24),
    country: DataTypes.STRING(2),
    lat: DataTypes.DECIMAL(10, 7),
    lng: DataTypes.DECIMAL(10, 7)
  }, {
    tableName: 'addresses',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Address.associate = (db) => {
    Address.hasMany(db.Store, { foreignKey: 'address_id', as: 'stores' });
  };
  return Address;
};
