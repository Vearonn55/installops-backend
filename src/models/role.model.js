// src/models/role.model.js

export default (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },

      // IMPORTANT FIX:
      // Use JSONB so Sequelize returns an actual JS array instead of a text string.
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'roles',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Role.associate = (db) => {
    Role.hasMany(db.User, {
      foreignKey: 'role_id',
      as: 'users',
    });
  };

  return Role;
};
