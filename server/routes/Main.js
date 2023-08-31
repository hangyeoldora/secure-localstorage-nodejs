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

/** 난수 생성 */
const genRandomKey = () => {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randKey = '';
  for (let i = 0; i < 32; i++) {
    randKey += charSet.charAt(Math.floor(Math.random() * charSet.length));
  };
  return randKey;
};

// 고유식별정보(Dv) - mac 주소
router.post("/getMac", async (req, res) => {
  const { saltItem } = await req.body;
  saltItem && (aesIv = saltItem);

  // mac 주소 획득 및 처리
  macAddress.one().then(mac => {
    // mac 주소 AES 암호화
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
   
    res.send({ macAddress: encodeStr }); // 암호화된 mac 주소 전송
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
  const decrypt = new jsencrypt.JSEncrypt();
  decrypt.setPrivateKey(process.env.PRIV_PEM);
  const uncrypted = decrypt.decrypt(enc);
  console.log(uncrypted);
  const newSecretKey = genRandomKey();

  // encrytedIds 테이블 내 데이터 여부 확인
  const idIns = await encryptedId.findOne({
    where: { hash: uncrypted.toString() },
  });
  if (idIns) {
    res.send({ id: idIns.id });
    res.status(200).end();
  } else {
    // 해당 값 테이블 insert
    await encryptedId.create({
      hash: uncrypted.toString(),
      key: newSecretKey,
    });
    const idIns = await encryptedId.findOne({
      where: { hash: uncrypted.toString() },
    });
    res.send({ id: idIns.id });
    res.status(200).end();
  };
});

// id 확인 후, 새 암호키 전송
router.post("/getSecretKey", async ( req, res ) => {
  const { id } = await req.body;
  console.group('-- id 존재 여부 확인 -- ');
  console.log(id);

  const isIdExist = await encryptedId.findOne({ where: { id: id } });
  if(!isIdExist){
    console.log('not exist');
    res.json({error: "해당 id 없음 에러 발생"});
    res.status(400).end();
  } else {
    findId = id;
    console.log('id 있음');
    newRandomKey = genRandomKey(); // 난수 r1 생성
    res.json({newSecretKey:newRandomKey});
    res.status(200).end();
  };
  console.groupEnd();
  console.log('end -------------');
});

// 새로운 hash 값과 암호문(enc(Dv, h(Dv||salt))) 전달
router.post("/getNewHash", async ( req, res ) => {
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
    res.status(400).end();
  } else {
    const existHash = CryptoJS.SHA3(idIns?.dataValues?.hash + newRandomKey, { outputLength: 256 }).toString(CryptoJS.enc.Hex);

    // h(h(Dv||salt)||r1)과 h(h(Dv||salt)||r2) 해시값 비교
    if(existHash === hash){
      console.log('해시 값이 동일함');
      // 중복 제거 필요
      const newR2Hash = CryptoJS.SHA3(idIns?.dataValues?.hash + newRandomKey2, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
      console.log(idIns?.dataValues?.hash);
      const cipherStr = CryptoJS.AES.encrypt(
        idIns?.dataValues?.key,
        CryptoJS.enc.Utf8.parse(idIns?.dataValues?.hash),
        {
          iv: CryptoJS.enc.Utf8.parse(""),
          padding: CryptoJS.pad.Pkcs7,
          mode: CryptoJS.mode.CBC,
        }
      );
      console.log(cipherStr.toString());
      
      res.json({ newR2Hash, cipherStr: cipherStr.toString() });
    } else {
      console.log('not good');
      res.json({ error: "해시값 일치하지 않음" });
      res.status(500).end();
    };
  }
});

module.exports = router;