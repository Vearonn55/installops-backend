export default (sequelize, DataTypes) => {
  const InstallationItem = sequelize.define('InstallationItem', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    installation_id: { type: DataTypes.UUID, allowNull: false },
    external_product_id: { type: DataTypes.STRING(64), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    room_tag: DataTypes.STRING(80),
    special_instructions: DataTypes.TEXT
  }, {
    tableName: 'installation_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['installation_id'] }, { fields: ['external_product_id'] }]
  });
  InstallationItem.associate = (db) => {
    InstallationItem.belongsTo(db.Installation, { foreignKey: 'installation_id', as: 'installation' });
  };
  return InstallationItem;
};
