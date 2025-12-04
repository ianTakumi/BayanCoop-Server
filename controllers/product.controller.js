import { supabase } from "../utils/supabase_client.js";

// Get all products with price and inventory
export const getAllProducts = async (req, res) => {
  try {
    const { coopId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = "",
      category_id,
      is_active,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*),
        supplier:suppliers(*),
        current_price:product_prices!inner(
          cost_price,
          selling_price,
          profit_margin,
          effective_date
        ),
        inventory:inventory!inner(
          current_stock,
          min_stock_level,
          max_stock_level,
          expiry_date,
          location,
          batch_number,
          last_restocked_at
        )
      `,
        { count: "exact" }
      )
      .eq("coop_id", coopId)
      .eq("current_price.is_current", true)
      .order("created_at", { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,barcode.ilike.%${search}%`
      );
    }

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: data || [],
      meta: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("Error getting products: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get single product with details
export const getProductById = async (req, res) => {
  try {
    const { coopId, productId } = req.params;

    // Get product with all related data
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*),
        supplier:suppliers(*),
        prices:product_prices(*),
        inventory:inventory(*)
      `
      )
      .eq("id", productId)
      .eq("coop_id", coopId)
      .single();

    if (productError) throw productError;

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: productData,
    });
  } catch (err) {
    console.error("Error getting product: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create new product with price and inventory
export const createProduct = async (req, res) => {
  try {
    const { coopId } = req.params;
    const {
      // Product fields
      name,
      description,
      category_id,
      unit_type = "pcs",
      package_size,
      weight_grams,
      dimensions_cm,
      brand,
      barcode,
      source_type = "supplier",
      supplier_id,
      producer_name,
      images = [],
      storage_instructions,
      shelf_life_days,
      requires_refrigeration = false,
      is_fragile = false,
      tags = [],

      // Price fields
      cost_price,
      selling_price,

      // Inventory fields
      current_stock = 0,
      min_stock_level = 10,
      max_stock_level,
      expiry_date,
      location,
      batch_number,
    } = req.body;

    // Validate required fields
    if (!name || !cost_price || !selling_price) {
      return res.status(400).json({
        success: false,
        message: "Name, cost_price, and selling_price are required",
      });
    }

    if (cost_price > selling_price) {
      return res.status(400).json({
        success: false,
        message: "Selling price must be greater than or equal to cost price",
      });
    }

    // Validate source type
    if (source_type === "supplier" && !supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required for supplier-sourced products",
      });
    }

    // Start transaction using Supabase RPC (simulated)
    const productData = {
      name,
      description,
      category_id,
      unit_type,
      package_size,
      weight_grams,
      dimensions_cm,
      brand,
      barcode,
      source_type,
      supplier_id,
      producer_name,
      images,
      storage_instructions,
      shelf_life_days,
      requires_refrigeration,
      is_fragile,
      coop_id: coopId,
      tags,
      is_active: true,
      is_featured: false,
      is_new_arrival: true,
      is_best_seller: false,
    };

    // Insert product
    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (productError) throw productError;

    // Insert price
    const priceData = {
      product_id: newProduct.id,
      coop_id: coopId,
      cost_price,
      selling_price,
      is_current: true,
      effective_date: new Date().toISOString().split("T")[0],
    };

    const { error: priceError } = await supabase
      .from("product_prices")
      .insert(priceData);

    if (priceError) throw priceError;

    // Insert inventory
    const inventoryData = {
      product_id: newProduct.id,
      coop_id: coopId,
      current_stock,
      min_stock_level,
      max_stock_level,
      expiry_date,
      location,
      batch_number,
      last_restocked_at: current_stock > 0 ? new Date().toISOString() : null,
    };

    const { error: inventoryError } = await supabase
      .from("inventory")
      .insert(inventoryData);

    if (inventoryError) throw inventoryError;

    // Get complete product data
    const { data: completeProduct, error: fetchError } = await supabase
      .from("products")
      .select(
        `
        *,
        current_price:product_prices!inner(*),
        inventory:inventory!inner(*)
      `
      )
      .eq("id", newProduct.id)
      .eq("current_price.is_current", true)
      .single();

    if (fetchError) throw fetchError;

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: completeProduct,
    });
  } catch (err) {
    console.error("Error creating product: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: err.message,
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { coopId, productId } = req.params;
    const updateData = req.body;

    // Check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("coop_id", coopId)
      .single();

    if (checkError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Remove price and inventory fields from product update
    const { cost_price, selling_price, ...productUpdateData } = updateData;

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update({
        ...productUpdateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("coop_id", coopId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update price if provided
    if (cost_price !== undefined || selling_price !== undefined) {
      // First, set all existing prices to not current
      await supabase
        .from("product_prices")
        .update({ is_current: false })
        .eq("product_id", productId)
        .eq("coop_id", coopId)
        .eq("is_current", true);

      // Insert new price
      const priceData = {
        product_id: productId,
        coop_id: coopId,
        cost_price: cost_price || 0,
        selling_price: selling_price || 0,
        is_current: true,
        effective_date: new Date().toISOString().split("T")[0],
      };

      await supabase.from("product_prices").insert(priceData);
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    console.error("Error updating product: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: err.message,
    });
  }
};

// Update inventory
export const updateInventory = async (req, res) => {
  try {
    const { coopId, productId } = req.params;
    const {
      current_stock,
      min_stock_level,
      max_stock_level,
      expiry_date,
      location,
      batch_number,
      adjustment_type, // 'restock', 'sale', 'adjustment', 'damage'
      adjustment_quantity,
      adjustment_reason,
    } = req.body;

    // Get current inventory
    const { data: currentInventory, error: fetchError } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_id", productId)
      .eq("coop_id", coopId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    let newStock = current_stock;

    // Handle stock adjustment if provided
    if (adjustment_type && adjustment_quantity !== undefined) {
      const quantity = parseInt(adjustment_quantity);

      if (currentInventory) {
        switch (adjustment_type) {
          case "restock":
            newStock = currentInventory.current_stock + quantity;
            break;
          case "sale":
            newStock = currentInventory.current_stock - quantity;
            if (newStock < 0) newStock = 0;
            break;
          case "damage":
            newStock = currentInventory.current_stock - quantity;
            if (newStock < 0) newStock = 0;
            break;
          case "adjustment":
            newStock = quantity;
            break;
        }
      } else {
        newStock = quantity;
      }
    }

    const inventoryData = {
      product_id: productId,
      coop_id: coopId,
      current_stock: newStock !== undefined ? newStock : current_stock,
      min_stock_level:
        min_stock_level !== undefined
          ? min_stock_level
          : currentInventory?.min_stock_level || 10,
      max_stock_level:
        max_stock_level !== undefined
          ? max_stock_level
          : currentInventory?.max_stock_level,
      expiry_date:
        expiry_date !== undefined ? expiry_date : currentInventory?.expiry_date,
      location: location !== undefined ? location : currentInventory?.location,
      batch_number:
        batch_number !== undefined
          ? batch_number
          : currentInventory?.batch_number,
      updated_at: new Date().toISOString(),
    };

    // Update or insert inventory
    let result;
    if (currentInventory) {
      // Update existing
      const { data, error } = await supabase
        .from("inventory")
        .update(inventoryData)
        .eq("id", currentInventory.id)
        .select()
        .single();

      result = data;
      if (error) throw error;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("inventory")
        .insert({
          ...inventoryData,
          last_restocked_at:
            adjustment_type === "restock" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      result = data;
      if (error) throw error;
    }

    // Create inventory transaction log
    if (adjustment_type) {
      await supabase.from("inventory_transactions").insert({
        inventory_id: result.id,
        product_id: productId,
        transaction_type: adjustment_type,
        quantity_change: adjustment_quantity,
        quantity_before: currentInventory?.current_stock || 0,
        quantity_after: newStock,
        reference_type: "manual_adjustment",
        notes: adjustment_reason,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: result,
    });
  } catch (err) {
    console.error("Error updating inventory: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update inventory",
      error: err.message,
    });
  }
};

// Archive/Delete product
export const archiveProduct = async (req, res) => {
  try {
    const { coopId, productId } = req.params;
    const { archive_reason } = req.body;

    const { data, error } = await supabase
      .from("products")
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        archived_reason: archive_reason || "Archived by admin",
      })
      .eq("id", productId)
      .eq("coop_id", coopId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product archived successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error archiving product: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to archive product",
      error: err.message,
    });
  }
};

// Restore archived product
export const restoreProduct = async (req, res) => {
  try {
    const { coopId, productId } = req.params;

    const { data, error } = await supabase
      .from("products")
      .update({
        is_active: true,
        archived_at: null,
        archived_reason: null,
      })
      .eq("id", productId)
      .eq("coop_id", coopId)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product restored successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error restoring product: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to restore product",
      error: err.message,
    });
  }
};

// Get product price history
export const getPriceHistory = async (req, res) => {
  try {
    const { coopId, productId } = req.params;

    const { data, error } = await supabase
      .from("product_prices")
      .select("*")
      .eq("product_id", productId)
      .eq("coop_id", coopId)
      .order("effective_date", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Price history fetched successfully",
      data: data || [],
    });
  } catch (err) {
    console.error("Error getting price history: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get price history",
      error: err.message,
    });
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
  try {
    const { coopId } = req.params;
    const threshold = req.query.threshold || 10;

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        inventory!inner(
          current_stock,
          min_stock_level
        )
      `
      )
      .eq("coop_id", coopId)
      .eq("is_active", true)
      .lte("inventory.current_stock", threshold)
      .order("inventory.current_stock", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Low stock products fetched successfully",
      data: data || [],
    });
  } catch (err) {
    console.error("Error getting low stock products: ", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get low stock products",
      error: err.message,
    });
  }
};
