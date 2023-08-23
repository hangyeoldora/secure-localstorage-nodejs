const express = require("express");
const router = express.Router();
const macAddress = require("macaddress");
const CryptoJS = require("crypto-js");
const jsencrypt = require("nodejs-jsencrypt");
const { encryptedId } = require("../models");

require("dotenv").config();

const secretKey = "YrvfhEoPhjAGC28R1q78zkD2ydrEcIxs";
let encodeStr = "";
let newRandomKey = null;
let findId = null;
let aesIv = null;

// 고유식별정보 - 맥 주소
router.post("/getMac", async (req, res) => {
  const { saltItem } = await req.body;
  saltItem && (aesIv = saltItem);
  console.log('saltItem:',saltItem);
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

   
    res.send({ macAddress: encodeStr });
    res.status(200).end()
  });
});

// 공개키
router.get("/getPk", async ( req, res ) => {
  res.send({ pk: process.env.PUB_PEM });
  res.status(200).end();
});

// 암호문 저장
router.post("/setDb", async ( req, res ) => {
  const { enc } = await req.body;
  console.log(enc);
  // const sKey = CryptoJS.lib.WordArray.random(128 / 8); // salt 16
  const decrypt = new jsencrypt.JSEncrypt();
  decrypt.setPrivateKey(process.env.PRIV_PEM);
  const uncrypted = decrypt.decrypt(enc);
  console.log(uncrypted);
  const newSecretKey = 'OvLIdkJyTpSkDMa1hPcJ93OCP5Qkvtlk';

  try {
    await encryptedId.create({
      hash: uncrypted.toString(),
      key: newSecretKey,
    });
  } catch {
  }

  // hash 중복 방지 추가로 해당 조건 추가 필요
  const idIns = await encryptedId.findOne({
    where: { hash: uncrypted.toString() },
  });
  if (!idIns) {
    res.json({ error: 'hash 에러 발생' });
    res.status(500).end();
  } else {
    res.send({ id: idIns.id });
    res.status(200).end();
  };
});

// id 확인 후, 새 암호키 전송
router.post("/getSecretKey", async ( req, res ) => {
  const { id } = await req.body;
  console.group('-- id 존재 여부 확인 -- ');
  console.log(id);

  const isIdExist = await encryptedId.findOne({where: {id: id}});
  if(!isIdExist){
    console.log('not exist');
    res.json({error: "해당 id 없음 에러 발생"});
    res.status(500).end();
  } else {
    findId = id;
    console.log('id 있음');
    // 테스트 후, math로 변경
    newRandomKey = 'XCtSiLYEgU6gk4NZ3yyL6L9tIaIYvlrE';
    res.json({newSecretKey: newRandomKey});
    res.status(200).end();
  };
  console.groupEnd();
  console.log('end -------------');
});

router.post("/getNewHash", async (req, res) => {
  const { hash, newRandomKey2 } = await req.body;
  console.group('-- 새 해시값, 난수 전달 받음 -- ');
  console.log('hash', hash);
  console.log('newRandomKey2', newRandomKey2);
  console.groupEnd();
  console.log('end -------------');

  const idIns = await encryptedId.findOne({
    where: { id: findId }
  });
  
  if(!idIns){
    console.log('not exist in db');
    res.json({error: "db 에러 발생"});
    res.status(500).end();
  } else {
    const existHash = CryptoJS.SHA3(idIns?.dataValues?.hash + newRandomKey + aesIv, { outputLength: 256 }).toString(CryptoJS.enc.Hex);

    // 키 값 비교
    if(existHash === hash){
      console.log('해시 값이 동일함');
      // 중복 제거 필요
      const newR2Hash = CryptoJS.SHA3(idIns?.dataValues?.hash + newRandomKey2 + aesIv, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
      console.log(idIns?.dataValues?.hash);
      const cipherStr = CryptoJS.AES.encrypt(
        idIns?.dataValues?.key,
        CryptoJS.enc.Utf8.parse(idIns?.dataValues?.hash),
        {
          iv: CryptoJS.enc.Utf8.parse(aesIv),
          padding: CryptoJS.pad.Pkcs7,
          mode: CryptoJS.mode.CBC,
        }
      );
      console.log(cipherStr.toString());
      
      res.json({ newR2Hash, cipherStr: cipherStr.toString() });


    } else {
      console.log('not good');
      res.json({error: "해시값 일치하지 않음"});
      res.status(500).end();
    };


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


 // aes 복호화 처리
//  function decode2aes(data, secretKey, salt) {
//   const cipher = CryptoJS.AES.decrypt(
//     data,
//     CryptoJS.enc.Utf8.parse(secretKey),
//     {
//       iv: CryptoJS.enc.Utf8.parse(salt),
//       padding: CryptoJS.pad.Pkcs7,
//       mode: CryptoJS.mode.CBC,
//     }
//   );

//   decodeStr = cipher.toString(CryptoJS.enc.Utf8);
//   console.log("data : " + cipher);
// }