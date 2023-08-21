const express = require('express');
const router = express.Router();
const macAddress = require('macaddress');
const CryptoJS = require('crypto-js');

router.get('/getMac', (req, res) => {
    macAddress.one().then(mac => {
        const salt = CryptoJS.lib.WordArray.random(16);
        const plaintext = mac;
        const key = CryptoJS.PBKDF2("nice", salt, { keySize: 256 / 32, iterations: 1000 });
        const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv: salt });
        const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
        const sha3Hash = CryptoJS.SHA3(encryptedHex, { outputLength: 256 });
        const decrypted = CryptoJS.AES.decrypt(encrypted, key, {iv: salt});
        console.log('key:', key);
        console.log('encrypted:', encrypted);
        console.log('encryptedHex:', encryptedHex);
        console.log('sha3Hash:', sha3Hash);
        console.log('hashedResult:', key);

        console.log('------');
        console.log(decrypted);
        res.send(`
            <p>hi your macaddress is ${mac}</p>
            <p>encrypteed: ${encrypted}</p>
            <p>encrypteedHex: ${encryptedHex}</p>
            <p>decrypted: ${decrypted}</p>
        `);

    });
});

module.exports = router;