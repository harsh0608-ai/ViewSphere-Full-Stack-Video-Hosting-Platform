import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

dotenv.config();
import connectDB from "./db/db.js";

connectDB();

