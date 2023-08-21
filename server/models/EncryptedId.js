module.exports = (sequelize, DataTypes)=> {
    const EncryptedId = sequelize.define("encryptedId", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        hash: {
            type: DataTypes.STRING,
            allowNull: false
        }, 
        key: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });

    return EncryptedId;
}