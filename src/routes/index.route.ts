import { Express } from "express";
import { userRoutes } from "./user.route";


const mainRoutes = (app: Express): void => {
    const version = "/api";

    app.use(`${version}/auth`, userRoutes);



}

export default mainRoutes;