# web storage 기술 및 암복호화

## 웹 로컬스토리지 데이터 보안을 위한 연구 참조



### 개요

*논문의 내용을 바탕으로 최대한 비슷하게 구성하고 개발을 진행함

- 로컬스토리지는 입력된 데이터를 저장할 때, 평문 그대로 저장하기 때문에 xss부터 물리적인 공격 등 다양한 위험으로부터 노출되어 있음
- 논문의 목적은 외부 도메인에서 획득한 로컬스토리지 값의 확인 및 재사용을 불가능하게 하기 위함이며 값에 대한 확인과 재사용을 불가능하게 하여 로컬스토리지의 생성원에 대한 무결성 및 데이터의 기밀성을 보장하는 것
- 최종적으로는 암&middot;복호화 및 키 입력 등 모든 과정을 자동화하여 <u>여러 공격자 모델</u>에 대한 안전한 로컬스토리지 설계하고 개발하는 것
  
  - 3 가지의 공격자 모델
    - 도메인 위조 - salt 값
    - 다른 디바이스에서 접속 - Mac 주소
    - 암호화 파일 위조 - 해시값 변경

### 중점 요소

- 암&middot;복호화 과정은 모두 브라우저 내부에서 이루어지며, 암호키의 입력 또한 사용자에 의한 입력이 아닌 브라우저 내부에서 서버에 요구
- 암호키는 서버에서 생성하고 보관
- 암호화에 사용되는 키의 길이는 대칭키 암호 알고리즘의 보안 권고사항인 128비트 이상의 값 사용
  - 개발에서는 256 사용
- 디바이스 고유 식별 정보는 로컬스토리지에 저장하지 않음
- 인증 프로토콜은 난수 기반으로 인증을 함

### 암호화 라이브러리

- CryptoJS - 암호화 및 해싱
  - 암호화에는 대칭키 암호화 방식 AES 사용
    - 운영모드는 'CBC'
  - 해싱은 SHA3 방식 사용

- JSencrypt - 키 생성 요청 시, 해시값 암&middot;복호화
  - RSA 암호화 방식을 사용

- CryptoJS 라이브러리 - <a href="https://cryptojs.gitbook.io/docs/" target="_blank">공식문서</a>
- JSencrypt 라이브러리 - <a href="https://travistidwell.com/jsencrypt/" target="_blank">공식문서</a>

### 단계

각 단계는 크게 4가지로 구성

- initialize
- verification & Request Key
- Load
- Save

#### 1. Initialize

1. 최초 실행 시, salt 생성
   - 128/8 - 16바이트 설정

2. 생성된 salt 값을 localStorage에 저장

3. 서버에 Dv(고유식별정보 - Mac Address) 요청

   * mac 주소의 경우, 서버 측에서 <u>AES 암호화</u> 처리

   * AES 암호화 처리에 필요한 공개키(Pk)와 비밀키(Sk)는 ```openssl 기본 rsa 1024```로 생성하고, 키 값은 환경 변수에 저장

   * 패딩 - Pkcs7

   * 운영모드 - CBC

4. 클라이언트
   - 서버로부터 암호화 처리된 Dv 값을 받음
   - localStorage의 salt와 받은 공개키(Pk)로 해시값(h(Dv||Salt)) 생성
   - 해시값 해싱은 SHA3로 하며, output 길이는 128로 설정
   - 공개키(Pk)로 해시값(h(Dv||Salt))을 <u>RSA 암호화</u>(JSencrypt 라이브러리) => 암호문(enc(h(Dv||Salt), Pk)) 생성
   - 서버에 암호키 생성 요청을 하면서 암호문(enc(h(Dv||Salt), Pk) ) 전달

5. 서버
   - 암호키 생성
   - 받은 암호문을 비밀키(Sk)로 복호화
   - hash와 key를 db에 저장하며, id는 인덱스에 필요하므로 autoIncrement 적용
   - 완료 status와 id를 클라이언트에 전달

#### 2. Verification & Request Key

1. 클라이언트
   - localstorage의 salt와 Dv(고유식별정보)로 해시값 생성 - SHA3
   - id를 서버에 보내고 암호화 키 요청
2. 서버
   - db에서 요청 받은 id에 일치하는 data 탐색
   - data가 있다면 인증에 사용될 난수(r1)를 생성하고 클라이언트에 전달
3. 클라이언트
   - 전달 받은 난수(r1)와 앞서 만든 해시값(h(Dv||Salt)으로 새로운 해시값(h(h(Dv||Salt)||r1)을 생성
   - 새로운 난수(r2) 생성
   - 서버에 새로운 해시값(h(h(Dv||Salt)||r1)과 난수(r2)를 전송
4. 서버
   - id와 일치하는 db의 data로부터 hash를 가져와서 난수(r1)를 이용하여 해시값(h(Dv||Salt)||r1) 생성
   - 전달 받은 해시값과 생성한 해시값을 비교하여 일치하는지 확인
   - 일치할 경우, 전달 받은 난수(r2)로 새로운 해시값(h(h(Dv||Salt)||r2)) 생성
   - db의 암호키를 db에 저장된 해시값으로 <u>AES 암호화</u>하여 암호문(enc(Key, h(Dv||Salt))) 생성
   - 클라이언트에게 새로운 해시값(h(h(Dv||Salt)||r2))과 암호문(enc(Key, h(Dv||Salt))) 전달
5. 클라이언트
   - 생성한 난수(r2)로 해시값(h(h(Dv||Salt)||r2)) 생성
   - 전달 받은 해시값과 생성한 해시값을 비교하여 일치하는지 확인
   - 값이 동일한 경우, 신뢰 가능한 웹페이지라고 판단
   - 전달 받은 암호문(enc(Key, h(Dv||Salt)))을 <u>AES 복호화</u>하여 암호키(Key)를 사용



#### 3. Save

1. 클라이언트

   - 암호키(Key) 여부 확인
   - 암호키(Key)가 있을 경우, 인증 절차(Verification & Request Key)를 거쳐 암호키(Key)를 발급
   - 서버로부터 받은 암호키를 비밀키로 사용자의 data를 AES 암호화 처리 (enc(Data))
   - 암호화된 data(enc(Data))를 localStorage에 저장

   

#### 4. Load

1. 클라이언트
   - 암호키 및 암호화 파일(enc(Data)) 확인
   - 둘 다 존재할 경우, 인증 절차(Verification & Request Key)를 진행
   - 서버로부터 받은 암호키(Key)를 사용하여 암호화된 파일(enc(Data))을 복호화



### 설치

#### client

###### 개요

- 해싱, 암&middot;복호화 통신이 주 목적이기에 일단 **html과 js**로만 구성
- html 환경에서의 환경 변수(.env) 사용이 되지 않기에 mac 주소 암호화에 사용되는 secretKey는 변수로 사용 -> 차후 수정 필요

###### 사용 라이브러리

- crypto-js
- jsencrypt

#### server

###### 개요

- 고유식별정보(Mac 주소)가 필요하기 때문에 서버 구축 필요

- **node.js**를 기반으로 개발

##### 버전

- 16.19.1 (LTS)

##### 포트

- 3002

##### 데이터베이스

- 키 보관을 위해 MySQL 사용
- id, hash, key

##### 사용 라이브러리

- crypto-js
- nodejs-jsencrypt
- express
- cors
- dotenv
- mysql2
- sequelize
- sequelize-cli
- nodemon
- macaddress



##### 설치 및 실행 방법

- 설치

  ```powershell
  npm i
  ```

  

- sequelize의 설정 파일(config.js)의 mySQL db 정보 및 고유 식별 정보 암&middot;복호화에 사용하는 공개키, 비밀키 값은 **환경 변수 파일(.env) 생성 필요** (server 폴더 최상단 위치)

  ```javascript
  MYSQL_USER = root
  MYSQL_PASSWORD = lhg37099
  MYSQL_DATABASE = testing
  MYSQL_HOST = 127.0.0.1
  DIALECT = mysql
  MYSQL_PORT = 3306
  
  PRIV_PEM = `-----BEGIN RSA PRIVATE KEY-----
  MIICXQIBAAKBgQC4Iu3CDzvbswzNRIqTxb59YE2UWX1u1VefR5G+kShQaPNshMXL
  a469BqwkuhIO2000XYfE3mUZmhgCL6zQy/KGXZIoYBM7D54TOaJXfTw/NADmGu8x
  mj/JpQf1jPxmskq0wSVPZpexfOBb6IJ0t291SafSaPMFgCqtV8fTaYXUVQIDAQAB
  AoGAGGkI++DpHobt+4hKlqxwRE6v+iqi5j6CDyt9trWnkoFXQ9uWHRF1KrnnuDay
  jiWkZny/sumInYxAAoovbr6at9uvEiz7h1sgYlh+pEnBoQrYNxYAEhMnLoxlH1zY
  XEzRfacd0OLlIXYSnkw1iw+BYw5pgUwJp/YmI0bBsP+4Y0ECQQDjdIQUD1K0826A
  qpe3+QL9YtB78kgubkr6YkzxKgcz4WQelgmLnTIZzXp5UdcvaASoA8OSTwCutu2t
  OKXZ7eaTAkEAzz606gUxtHyD7jaMIm+0icrQ11oFnQxgY1lobs5U+ByheLvTRVma
  ZrmlmBfir7xnNU67svV2cc2E023ylmOCdwJBAL0x4N8Ss9gCGKt7usFzpnH/7Kz8
  pd/BLCrC838yV1VnKLFsWbpA4jimOzaIxbYQDrd2kgm0Hzw0utR4JzRz93MCQBTB
  zxTxWD0fi4c8Z2S7k3WJnsky9wT3zF+nANK4T8JZ+8I/7bUweEp5paBKJCY91Ih+
  TkZqV2amkvsqM/XkGZkCQQCDvyL+iuOoxOqpRlC2z8udAFqtPPyVqYbCAgth+Nw+
  VavR7IfZ+BB9/v50nA4nFs4axoecK0tCFYIMWEmaQF1k
  -----END RSA PRIVATE KEY-----`
  
  PUB_PEM = `-----BEGIN PUBLIC KEY-----
  MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4Iu3CDzvbswzNRIqTxb59YE2UWX1u1VefR5G+kShQaPNshMXLa469BqwkuhIO2000XYfE3mUZmhgCL6zQy/KGXZIoYBM7D54TOaJXfTw/NADmGu8xmj/JpQf1jPxmskq0wSVPZpexfOBb6IJ0t291SafSaPMFgCqtV8fTaYXUVQIDAQAB
  -----END PUBLIC KEY-----`
  ```

  

- MySQL의 경우, 컴퓨터에 맞는 값으로 변경 필요

- 실행

  ```powershell
  npm run devStart
  ```

  

- 실행 후, client/index.html 파일을 열고 콘솔창으로 확인

- 최초 등록(Initialize)은 페이지에 접속 시에 자동으로 진행

- 위에서 언급한 3가지 공격자 모델에 대한 취약점에 대해 안전

