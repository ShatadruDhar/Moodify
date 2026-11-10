const mongoose = require("mongoose");

function connectToDB() {
    mongoose.connect(process.env.MONGO_URI)
        .catch(err => {
            console.error("Error connecting to DB", err)
        })
}

module.exports = connectToDB;