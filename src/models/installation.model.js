export default (sequelize, DataTypes) => {
  const Installation = sequelize.define(
    "Installation",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      // NEW: Human-readable installation code (INST-00001)
      install_code: {
        type: DataTypes.STRING(16),
        allowNull: false,
        unique: true,
      },

      external_order_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },

      store_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      scheduled_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      scheduled_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM(
          "scheduled",
          "in_progress",
          "completed",
          "failed",
          "canceled",
          "staged"
        ),
        allowNull: false,
        defaultValue: "scheduled",
      },

      // NEW: Difficulty enum
      difficulty: {
        type: DataTypes.ENUM("easy", "intermediate", "hard"),
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // NEW: Checklist result fields (aligns with DB)
      checklist_result: {
        type: DataTypes.ENUM("success", "failed"),
        allowNull: true,
      },

      checklist_failure_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      checklist_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "installations",
      underscored: true,

      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",

      indexes: [
        { fields: ["store_id"] },
        { fields: ["external_order_id"] },
        { fields: ["status"] },
        { fields: ["difficulty"] },
        { fields: ["install_code"] },
      ],
    }
  );

  Installation.associate = (db) => {
    Installation.belongsTo(db.Store, {
      foreignKey: "store_id",
      as: "store",
    });

    Installation.belongsTo(db.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Installation.belongsTo(db.User, {
      foreignKey: "updated_by",
      as: "updater",
    });

    Installation.hasMany(db.InstallationItem, {
      foreignKey: "installation_id",
      as: "items",
    });

    Installation.hasMany(db.CrewAssignment, {
      foreignKey: "installation_id",
      as: "crew",
    });

    Installation.hasMany(db.ChecklistResponse, {
      foreignKey: "installation_id",
      as: "checklistResponses",
    });

    Installation.hasMany(db.MediaAsset, {
      foreignKey: "installation_id",
      as: "media",
    });
  };

  return Installation;
};
