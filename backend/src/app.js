import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(
    cors({
        origin: "http://localhost:3000", // عنوان Next.js
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);

export default app;