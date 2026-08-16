import express from "express";
import { createProduct } from "../controllers/productController.js";
import { isAuthenticated,authorizeRoles } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/admin/create",isAuthenticated,authorizeRoles("Admin"),createProduct);


export default router;