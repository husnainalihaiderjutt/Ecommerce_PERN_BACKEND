import { createUserTable } from "../models/userTable.js"
import { createProductsTable } from "../models/productTable.js"
import { createProductReviewTable } from "../models/productReviewsTable.js"
import { CreateOrderTable } from "../models/ordersTable.js"
import { createOrderItemTable } from "../models/orderItemsTable.js"
import { createPaymentsTable } from "../models/paymentsTable.js"
import { shippinginfoTable } from "../models/shippinginfoTable.js"

export const createTables = async()=>{
    try {
        await createUserTable();
        await CreateOrderTable();
        await createProductsTable();
        await createOrderItemTable();
        await createPaymentsTable();
        await createProductReviewTable();
        await shippinginfoTable();
        console.log("All tables is created successfully");
    } catch (error) {
        console.error("Failed to create tables");
    }
}
export default createTables