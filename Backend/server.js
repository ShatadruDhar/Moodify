require("dotenv").config();
const app = require("./src/app")
const connectToDB = require("./src/config/database");


connectToDB();

const port = process.env.PORT || 3000;
const host = process.env.LOCAL_SONGS_DIR
    ? "127.0.0.1"
    : (process.env.HOST || "0.0.0.0")

app.listen(port, host)