import express from "express";
import { createProduct , fetchAllProducts } from "../controllers/productController.js";
import { isAuthenticated,authorizeRoles } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/admin/create",isAuthenticated,authorizeRoles("Admin"),createProduct);
router.get("/",fetchAllProducts);


export default router;