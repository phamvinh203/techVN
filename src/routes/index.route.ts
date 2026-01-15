import { Express } from "express";
import { userRoutes } from "./user.route";
import { categoriesRoutes } from "./categories.route";
import { brandsRoutes } from "./brands.route";
import { bannerRoutes } from "./banner.route";
import { productsRoutes } from "./products.route";
import { searchRoutes } from "./search.route";
import { cartRoutes } from "./cart.route";
import { ordersRoutes } from "./orders.route";
import { reviewRoutes } from "./review.route";



const mainRoutes = (app: Express): void => {
    const version = "/api";

    app.use(`${version}/auth`, userRoutes);

    app.use(`${version}/categories`, categoriesRoutes);

    app.use(`${version}/brands`, brandsRoutes);

    app.use(`${version}/banners`, bannerRoutes);

    app.use(`${version}/products`, productsRoutes);

    app.use(`${version}/search`, searchRoutes);

    app.use(`${version}/cart`, cartRoutes);

    app.use(`${version}/orders`, ordersRoutes);

    app.use(`${version}/reviews`, reviewRoutes);

}

export default mainRoutes;