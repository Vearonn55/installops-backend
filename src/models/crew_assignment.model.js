export default (sequelize, DataTypes) => {
  const CrewAssignment = sequelize.define('CrewAssignment', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    installation_id: { type: DataTypes.UUID, allowNull: false },
    crew_user_id: { type: DataTypes.UUID, allowNull: false },
    role: DataTypes.STRING(48),
    accepted_at: DataTypes.DATE,
    declined_at: DataTypes.DATE
  }, {
    tableName: 'crew_assignments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['installation_id'] }, { fields: ['crew_user_id'] }]
  });
  CrewAssignment.associate = (db) => {
    CrewAssignment.belongsTo(db.Installation, { foreignKey: 'installation_id', as: 'installation' });
    CrewAssignment.belongsTo(db.User, { foreignKey: 'crew_user_id', as: 'crew' });
  };
  return CrewAssignment;
};
