const LOCAL_URL = "http://localhost:3002";

/** 난수 생성 */
const genRandomKey = () => {
  const charSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randKey = "";
  for (let i = 0; i < 32; i++) {
    randKey += charSet.charAt(Math.floor(Math.random() * charSet.length));
  }
  return randKey;
};

/** 서버로부터 mac 주소(aes256), pk 요청 */
const getMacData = async () => {
  const saltItem = localStorage.getItem("salt");
  return await fetch(`${LOCAL_URL}/getMac`, {
    method: "POST",
    body: JSON.stringify({ saltItem }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((res) => {
      return res.macAddress;
    })
    .catch((err) => console.error("err", err));
};

/** 공개키(pk) 추출 */
const getPkData = async () =>
  await fetch(`${LOCAL_URL}/getPk`)
    .then((response) => response.json())
    .then((res) => {
      return res.pk;
    })
    .catch((err) => console.log("err", err));

/** mac 주소 일치 여부 파악용 - aes 디코딩 */
const aes256Decode = (data, secretKey, Iv) => {
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
};

/**
 * SHA3 사용 해시값 생성 (Dv || Salt)
 * @param {string} sourceData
 * @param {string} salt
 * @returns {string} 해시값
 */
const getHash2sha3 = async (sourceData, salt) => {
  return await CryptoJS.SHA3(sourceData + salt, { outputLength: 256 }).toString(
    CryptoJS.enc.Hex
  );
};

/** 해싱 및 암호화 처리 후, db 저장 요청 */
const hashData = async (mac, pk, salt) => {
  console.group("해시 및 암호화");
  console.log("암호화된 mac 주소:", mac);

  const saltItem = localStorage.getItem("salt");
  const sha3Hash = await getHash2sha3(macAddr, saltItem); // 해시값 (Dv, salt);
  console.log("해시값 h(Dv||salt): ", sha3Hash);

  // 서버로부터 받은 Pk를 이용한 해시값(Dv||Salt) 암호화
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(pk);
  const encrypted = encryptor.encrypt(sha3Hash);
  console.log("암호문 (enc(h(Dv||salt), Pk):", encrypted);
  console.groupEnd();

  // 암호문 서버 전송 및 데이터베이스 저장
  return await fetch(`${LOCAL_URL}/setDb`, {
    method: "POST",
    body: JSON.stringify({
      enc: encrypted,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((res) => {
      return res.id;
    })
    .catch((err) => {
      console.log("db 저장 에러 발생");
      return err;
    });
};

/** 기존 해시값과 신규 해시값 비교. */
const checkHash = async (sha3Hash, newHash, newRandomKey2) => {
  originSecretKey = null;
  return await fetch(`${LOCAL_URL}/getNewHash`, {
    method: "POST",
    body: JSON.stringify({
      hash: newHash,
      newRandomKey2: newRandomKey2,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((res) => {
      console.log(res);
      if (!res.error) {
        const { newR2Hash, cipherStr } = res;

        // 기존 해시값 + 난수 r2를 해싱 처리한 값과 서버로부터 받은 해시값 비교
        const existHash = CryptoJS.SHA3(sha3Hash + newRandomKey2, {
          outputLength: 256,
        }).toString(CryptoJS.enc.Hex);
        if (newR2Hash === existHash) {
          resultStr.innerText = "상태: 웹페이지 신뢰 ok";

          /** 해시값의 원본 암호키 디코딩 */
          const decryptCipher = CryptoJS.AES.decrypt(
            cipherStr,
            CryptoJS.enc.Utf8.parse(sha3Hash),
            {
              iv: CryptoJS.enc.Utf8.parse(""),
              padding: CryptoJS.pad.Pkcs7,
              mode: CryptoJS.mode.CBC,
            }
          );
          return decryptCipher.toString(CryptoJS.enc.Utf8);
        } else {
          resultStr.innerText = "상태: 웹페이지 신뢰 no";
        }
      } else {
        console.log(res.error);
        alert("해시 값 일치하지 않음");
        loadInput.value = "";
        return false;
      }
    })
    .catch((err) => {
      console.log("새 해시값 전달 실패", err);
      alert("새 해시값 전달 실패");
      return false;
    });
};

/** 검증 및 키 요청(verification & request key) */
const verify = async () => {
  await getMacData().then((res) => {
    macAddr = res;
  });
  const saltItem = localStorage.getItem("salt");
  console.log("verify salt", saltItem);
  const sha3Hash = await getHash2sha3(macAddr, saltItem);
  console.log("해시:", sha3Hash);

  let newHash = null;
  let newRandomKey2 = null;
  const localEncryptedId = localStorage.getItem("encryptedId");

  if (!localEncryptedId) {
    alert("id 값이 없음");
    return false;
  } else {
    // router post => 서버에 id 전달 및 암호화 키 요청
    await fetch(`${LOCAL_URL}/getSecretKey`, {
      method: "POST",
      body: JSON.stringify({
        id: localEncryptedId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then(async (res) => {
        console.log("서버로부터 받은 새 암호키", res.newSecretKey);
        // 기존 해시 값 + 서버로부터 받은 새 암호키 => 새로운 해시값 생성
        const getNewSha3Hash = getHash2sha3(sha3Hash + res.newSecretKey, "");

        await getNewSha3Hash
          .then((res) => {
            console.group("newHash & newSecretKey");
            console.log("새 해시값 h(h(Dv||salt)||r1):", res);
            newHash = res;
          })
          .catch((err) => {
            alert("새 해시값 생성 실패");
            return false;
          })
          .finally(async () => {
            newRandomKey2 = genRandomKey(); // 난수 r2 생성
            console.log("난수 r2:", newRandomKey2);
            console.groupEnd();
            await checkHash(sha3Hash, newHash, newRandomKey2).then((res) => {
              if (!res) {
                return false;
              } else {
                console.log(res);
                originSecretKey = res;
                console.log("originSecretKey:", originSecretKey);
              }
            });
          });
      });
  }
};
