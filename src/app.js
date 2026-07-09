import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN
    }
));

app.use(express.json({ limit: "16kb" }));    // used to parse incoming JSON requests
app.use(express.urlenconcoded({ extended: true })); // used to parse incoming URL-encoded requests
app.satatic("public"); // used to serve static files from the "public" directory
app.use(cookieParser()); // used to parse cookies from incoming requests


export default app;