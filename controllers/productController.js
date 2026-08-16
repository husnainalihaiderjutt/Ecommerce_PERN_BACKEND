import database from "../database/db";
import { catchAsyncErrors } from "../middlewares/catchAsyncError";
import ErrorHandler from "../middlewares/errorMiddleware";
import {v2 as cloudinary} from "cloudinary";

export const createProduct = catchAsyncErrors(async(req,res,next)=>{
    const {name, description, price, category, stock} = req.body;
    const created_by = req.user.id;

    if(!name || !description || !price || !category ){
        return next(new ErrorHandler("Please provide complete product details",400));
    }

    let uploadImages = [];
    if(req.files && req.files.images){
        const images = Array.isArray(req.files.images) 
        ? req.files.images
        :[req.files.images];

        for(const image of images){
            const result = await cloudinary.uploader.upload(image.tempFilePath , {
                folder:"Ecommerce_Product_image",
                width:1000,
                crop:"scale",
            });
            uploadImages.push({
                url: result.secure_url,
                public_id: result.public_id,
            });
        }
    }

    const product = await database.query(`
             INSERT INTO products (name, description, price, category, stock, images, created_by) 
             VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                name,
                description, 
                price, category, stock, 
                JSON.stringify(uploadImages),
                created_by
            ]);
    res.status(201).json({
        success: true,
        message: "Product added successfully",
        product: product.rows[0],
    });
});