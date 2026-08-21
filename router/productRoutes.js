import express from "express";
import { createProduct , fetchAllProducts,updateProducts,deleteProducts ,
fetchSingleProduct , postProductReview ,deleteReview , fetchAIFilteredProducts} from "../controllers/productController.js";
import { isAuthenticated,authorizeRoles } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/",fetchAllProducts);
router.post("/admin/create",isAuthenticated,authorizeRoles("Admin"),createProduct);
router.put("/admin/update/:productId",isAuthenticated,authorizeRoles("Admin"),updateProducts);
router.delete("/admin/delete/:productId",isAuthenticated,authorizeRoles("Admin"),deleteProducts);
router.get("/singleProduct/:productId",fetchSingleProduct);
router.put("/post-new/review/:productId",isAuthenticated,postProductReview);
router.delete("/delete/review/:productId",isAuthenticated,deleteReview);
router.post("/ai-search",isAuthenticated,fetchAIFilteredProducts);

export default router;