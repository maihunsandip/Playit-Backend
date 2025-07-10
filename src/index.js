import connectDB from "./db/connectDB.js";
import "dotenv/config";
import app from "./app.js"


connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`server is running at ${process.env.PORT}!!`);
    })
})
.catch((err) => {
    console.log("MongoDB connection error:" + err);
})