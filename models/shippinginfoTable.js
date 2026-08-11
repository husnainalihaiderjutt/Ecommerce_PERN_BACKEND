import database from "../database/db";

export const shippinginfoTable = async()=>{
    try {
        const querry = `
              CREATE TABLE IF NOT EXISTs shipping_info(
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    order_id UUID NOT NULL UNIQUE,
                    full_name VARCHAR(100) NOT NULL,
                    state VARCHAR(100) NOT NULL,
                    city VARCHAR(100) NOT NULL,
                    country VARCHAR(100) NOT NULL,
                    address TEXT NOT NULL,
                    pincode VARCHAR(10) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
              );
        `;
        await database.query(querry);
    } catch (error) {
        console.error("Failed to create a ShippingInfo table");
        process.exit(1);
    }
}