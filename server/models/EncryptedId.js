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
            allowNull: false,
            primaryKey: true,
            unique: true
        }, 
        key: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });

    return EncryptedId;
}  