const express = require("express");
const router = express.Router();
const macAddress = require("macaddress");
const CryptoJS = require("crypto-js");
const crypto = require("crypto");
const jsencrypt = require("nodejs-jsencrypt");
const { encryptedId } = require("../models");

require("dotenv").config();

const secretKey = "YrvfhEoPhjAGC28R1q78zkD2ydrEcIxs";
let encodeStr = "";
let decodeStr = "";
const aesIv = {
  words: [2078020608, 1336885616, 13338582, 176801844],
  sigBytes: 16,
};

// 고유식별정보 - 맥 주소
router.get("/getMac", (req, res) => {
  macAddress.one().then((mac) => {
    // aes 암호화 처리
    const cipher = CryptoJS.AES.encrypt(
      mac,
      CryptoJS.enc.Utf8.parse(secretKey),
      {
        iv: CryptoJS.enc.Utf8.parse(aesIv),
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      }
    );
    encodeStr = cipher.toString();

    // aes 복호화 처리
    function decode2aes(data, secretKey, Iv) {
      const cipher = CryptoJS.AES.decrypt(
        data,
        CryptoJS.enc.Utf8.parse(secretKey),
        {
          iv: CryptoJS.enc.Utf8.parse(Iv),
          padding: CryptoJS.pad.Pkcs7,
          mode: CryptoJS.mode.CBC,
        }
      );

      decodeStr = cipher.toString(CryptoJS.enc.Utf8);
      console.log("data : " + cipher);
    }
    res.send({ macAddress: encodeStr });
  });
});

// 공개키
router.get("/getPk", (req, res) => {
  res.send({ pk: process.env.PUB_PEM });
});

// 암호문 저장
router.post("/setDb", async (req, res) => {
  const { enc } = await req.body;
  console.log(enc);
  // const sKey = CryptoJS.lib.WordArray.random(128 / 8); // salt 16
  const decrypt = new jsencrypt.JSEncrypt();
  decrypt.setPrivateKey(process.env.PRIV_PEM);
  const uncrypted = decrypt.decrypt(enc);
  console.log(uncrypted);
  const newSecretKey = "OvLIdkJyTpSkDMa1hPcJ93OCP5Qkvtlk";

  try {
    await encryptedId.create({
      hash: uncrypted.toString(),
      key: newSecretKey,
    });
  } catch {}

  // hash 중복 방지 추가로 해당 조건 추가 필요
  const id = await encryptedId.findOne({
    where: { hash: uncrypted.toString() },
  });
  if (!id) {
    res.json({ error: "hash 에러 발생" });
  } else {
    res.send({ id: id.id });
  }
});

module.exports = router;

// const key = CryptoJS.PBKDF2("nice", salt, { keySize: 256 / 32, iterations: 1000 });
// const encrypted = CryptoJS.AES.encrypt(macAddr, privateKey, { iv: salt });
// const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
// const sha3Hash = CryptoJS.SHA3(encryptedHex, { outputLength: 256 });
// const decrypted = CryptoJS.AES.decrypt(encrypted, privateKey, {iv: salt});
// const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
// const sha3Hash = CryptoJS.SHA3(encryptedHex, { outputLength: 256 });
// const decrypted = CryptoJS.AES.decrypt(encrypted, key, {iv: salt});
// console.log('key:', key);
// console.log('encrypted:', encrypted);
// console.log('encryptedHex:', encryptedHex);
// console.log('sha3Hash:', sha3Hash);
// console.log('hashedResult:', key);
