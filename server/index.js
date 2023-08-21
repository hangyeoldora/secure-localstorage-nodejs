const express = require("express");
const app = express();
const cors = require("cors");
const db = require("./models");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const mainRotuer = require("./routes/Main");
app.use("/", mainRotuer);

db.sequelize.sync().then(() => {
  app.listen(3002, () => {
    console.log("3002 실행 중...");
  });
});
