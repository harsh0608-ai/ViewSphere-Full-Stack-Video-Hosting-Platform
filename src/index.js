import "dotenv/config";

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import app from "./app.js";

import connectDB from "./db/db.js";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
    app.on("error", (error) => {
        console.error("Error starting the server:", error);
    })
})
.catch((error) => {
  console.error("Error connecting to MongoDB:", error);
});