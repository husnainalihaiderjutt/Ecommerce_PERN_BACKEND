/** @format */

import database from "../database/db.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from "cloudinary";

export const createProduct = catchAsyncErrors(async (req, res, next) => {
  const { name, description, price, category, stock } = req.body;
  const created_by = req.user.id;

  if (!name || !description || !price || !category) {
    return next(
      new ErrorHandler("Please provide complete product details", 400),
    );
  }

  let uploadImages = [];
  if (req.files && req.files.images) {
    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    for (const image of images) {
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: "Ecommerce_Product_image",
        width: 1000,
        crop: "scale",
      });
      uploadImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }
  }

  const product = await database.query(
    `
             INSERT INTO products (name, description, price, category, stock, images, created_by) 
             VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      name,
      description,
      price,
      category,
      stock,
      JSON.stringify(uploadImages),
      created_by,
    ],
  );
  res.status(201).json({
    success: true,
    message: "Product added successfully",
    product: product.rows[0],
  });
});

export const fetchAllProducts = catchAsyncErrors(async (req, res, next) => {
  const { availability, price, category, rating, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const condition = [];
  let values = [];
  let index = 1;

  let paginationPlaceHolders = {};
  if (availability === "in-stock") {
    condition.push(`stock > 5`);
  } else if (availability === "limited") {
    condition.push(`stock >0 AND stock<=5`);
  } else if (availability === "out-of-stock") {
    condition.push(`stock = 0`);
  }

  if (price) {
    const [minPrice, maxPrice] = price.split("-");
    if (minPrice && maxPrice) {
      condition.push(`price BETWEEN $${index} AND $${index + 1}`);
      values.push(minPrice, maxPrice);
      index += 2;
    }
  }

  if (category) {
    condition.push(`category ILIKE $${index}`);
    values.push(`%${category}%`);
    index++;
  }
  if (rating) {
    condition.push(`ratings >= $${index}`);
    values.push(rating);
    index++;
  }
  if (search) {
    condition.push(`(p.name ILIKE $${index} OR p.description ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }
  const whereClause = condition.length
    ? `WHERE ${condition.join(" AND ")}`
    : "";
  const totalProductsResult = await database.query(
    `
             SELECT COUNT(*) FROM products p${whereClause}`,
    values,
  );
  const totalProducts = parseInt(totalProductsResult.rows[0].count);
  paginationPlaceHolders.limit = `$${index}`;
  values.push(limit);
  index++;

  paginationPlaceHolders.offset = `$${index}`;
  values.push(offset);
  index++;

  //Fetch with reviews
  const query = `
        SELECT p.*, COUNT (r.id) AS review_count FROM products p LEFT JOIN 
        reviews r ON p.id = r.product_id ${whereClause} 
        GROUP BY p.id ORDER BY p.created_at DESC
        LIMIT ${paginationPlaceHolders.limit}
        OFFSET ${paginationPlaceHolders.offset}`;

  const result = await database.query(query, values);
  //Query for fetching new products that are created recently under 30 days
  const newProductsQuerry = `
        SELECT p.* , COUNT (r.id) AS review_count FROM products p LEFT JOIN
        reviews r ON p.id = r.product_id 
        WHERE p.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 8
    `;
  const newProductsResults = await database.query(newProductsQuerry);

  const topRatingProductsQuery = `
        SELECT p.* , COUNT (r.id) AS review_count FROM products p LEFT JOIN 
        reviews r ON p.id = r.product_id 
        WHERE p.ratings >= 4.5
        GROUP BY p.id
        ORDER BY p.ratings DESC, p.created_at DESC 
        LIMIT 8
    `;
  const topRatedResults = await database.query(topRatingProductsQuery);

  res.status(200).json({
    success: true,
    products: result.rows,
    totalProducts,
    newProducts: newProductsResults.rows,
    topRatedProducts: topRatedResults.rows,
  });
});

export const updateProducts = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const { name, description, price, category, stock } = req.body;
  if (!name || !description || !price || !category || !stock) {
    return next(new ErrorHandler("Please fill all the required fields", 400));
  }
  const product = await database.query(
    `
        SELECT * FROM products WHERE id =$1`,
    [productId],
  );
  if (product.rows.length === 0) {
    return next(new ErrorHandler("No product found", 404));
  }
  const result = await database.query(
    `
        UPDATE products SET name = $1 , description = $2 , price = $3 , category = $4 , stock = $5 
        WHERE id = $6 RETURNING *`,
    [name, description, price, category, stock, productId],
  );
  res.status(200).json({
    success: true,
    message: "Product updated Successfully",
    updatedProduct: result.rows[0],
  });
});

export const deleteProducts = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const product = await database.query(
    `
        SELECT * FROM products WHERE id=$1`,
    [productId],
  );
  if (product.rows.length === 0) {
    return next(new ErrorHandler("Product Not found", 404));
  }
  const images = product.rows.images;
  const deleteResult = await database.query(
    `
        DELETE FROM products WHERE id=$1 RETURNING *`,
    [productId],
  );
  if (deleteResult.rows.length === 0) {
    return next(new ErrorHandler("Products could not be deleted", 500));
  }
  if (images && images.length > 0) {
    for (const image of images) {
      await cloudinary.uploader.destroy(image.public_id);
    }
  }
  res.status(200).json({
    success: true,
    message: "Product deleted Successfully",
  });
});

export const fetchSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.params;
  const result = await database.query(
    `
        SELECT p.*,
        COALESCE(
        json_agg(
        json_build_object(
            'review_id' , r.id,
            'rating' , r.ratings,
            'comment' , r.comment,
            'reviewer' , json_build_object(
            'id' , u.id,
            'name' , u.name,
            'avatar' , u.avatar
            ))
        )FILTER (WHERE r.id IS NOT NULL), '[]'
        )AS reviews
         FROM products p 
         LEFT JOIN reviews r ON p.id = r.product_id
         LEFT JOIN users u ON r.user_id = u.id
         WHERE p.id = $1
         GROUP BY p.id`,
    [productId],
  );
  res.status(200).json({
    success: true,
    message: "Product fetched Successfully",
    product: result.rows[0],
  });
});

export const postProductReview = catchAsyncErrors(async(req,res,next)=>{
   const {productId} = req.params;
   const {rating , comment} = req.body;
   if(!rating || ! comment){
    return next(new ErrorHandler("Please prodvide rating and comment",400));
   }

   const purchaseCheckQuerry = `
       SELECT oi.product_id
       FROM order_items oi 
       JOIN orders o ON o.id = oi.order_id
       JOIN payments p ON p.order_id = o.id
       WHERE o.buyer_id = $1
       AND oi.product_id = $2
       AND p.payment_status = 'Paid'
       LIMIT 1
   `;
});
