import { Express } from "express";
import { userRoutes } from "./user.route";
import { categoriesRoutes } from "./categories.route";
import { brandsRoutes } from "./brands.route";
import { bannerRoutes } from "./banner.route";
import { productsRoutes } from "./products.route";
import { searchRoutes } from "./search.route";


const mainRoutes = (app: Express): void => {
    const version = "/api";

    app.use(`${version}/auth`, userRoutes);

    app.use(`${version}/categories`, categoriesRoutes);

    app.use(`${version}/brands`, brandsRoutes);

    app.use(`${version}/banners`, bannerRoutes);

    app.use(`${version}/products`, productsRoutes);

    app.use(`${version}/search`, searchRoutes);

}

export default mainRoutes;