import express, { Express } from "express";

import dotenv from "dotenv";
import cors from "cors";
import * as database from "./config/db";
import mainRoutes from "./routes/index.route";

dotenv.config();

database.connect();

const app: Express = express();

const port: number | string = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


mainRoutes(app);

app.listen(port, () => {
  console.log(`localhost:${port}`);
});


