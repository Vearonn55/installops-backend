export default (sequelize, DataTypes) => {
  const MediaAsset = sequelize.define('MediaAsset', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    installation_id: { type: DataTypes.UUID, allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    type: { type: DataTypes.ENUM('photo','signature'), allowNull: false },
    tags: DataTypes.JSONB,
    sha256: DataTypes.STRING(64),
    created_by: DataTypes.UUID
  }, {
    tableName: 'media_assets',
    underscored: true,
    timestamps: false // only created_at in DB; DB sets it
  });
  MediaAsset.associate = (db) => {
    MediaAsset.belongsTo(db.Installation, { foreignKey: 'installation_id', as: 'installation' });
    MediaAsset.belongsTo(db.User, { foreignKey: 'created_by', as: 'creator' });
  };
  return MediaAsset;
};
