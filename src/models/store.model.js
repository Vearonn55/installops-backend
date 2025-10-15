export default (sequelize, DataTypes) => {
  const Store = sequelize.define('Store', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(160), allowNull: false },
    address_id: { type: DataTypes.UUID },
    timezone: DataTypes.STRING(64),
    external_store_id: DataTypes.STRING(64)
  }, {
    tableName: 'stores',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['address_id'] }, { fields: ['external_store_id'] }]
  });
  Store.associate = (db) => {
    Store.belongsTo(db.Address, { foreignKey: 'address_id', as: 'address' });
    Store.hasMany(db.Installation, { foreignKey: 'store_id', as: 'installations' });
  };
  return Store;
};
