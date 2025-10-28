import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Middleware setup
app.use(helmet());
app.use(cors({ 
    origin: process.env.FRONTEND_ORIGIN, 
    credentials: true 
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// API routes
app.use("/", routes);

// Error handling
app.use(errorHandler);

export default app;
