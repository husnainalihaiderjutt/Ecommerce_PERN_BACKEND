import express from "express";
import { createProduct , fetchAllProducts,updateProducts,deleteProducts ,fetchSingleProduct , postProductReview} from "../controllers/productController.js";
import { isAuthenticated,authorizeRoles } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/",fetchAllProducts);
router.post("/admin/create",isAuthenticated,authorizeRoles("Admin"),createProduct);
router.put("/admin/update/:productId",isAuthenticated,authorizeRoles("Admin"),updateProducts);
router.delete("/admin/delete/:productId",isAuthenticated,authorizeRoles("Admin"),deleteProducts);
router.put("/post-new/review/:productId",isAuthenticated,postProductReview);
router.get("/singleProduct/:productId",fetchSingleProduct);

export default router;