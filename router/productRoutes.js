import express from "express";
import { createProduct , fetchAllProducts,updateProducts } from "../controllers/productController.js";
import { isAuthenticated,authorizeRoles } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/",fetchAllProducts);

router.post("/admin/create",isAuthenticated,authorizeRoles("Admin"),createProduct);
router.put("/admin/update/:productId",isAuthenticated,authorizeRoles("Admin"),updateProducts);


export default router;