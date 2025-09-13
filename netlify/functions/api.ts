import express from "express";
import { registerRoutes } from "../../server/routes";
import serverless from "serverless-http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(app);

export const handler = serverless(app);