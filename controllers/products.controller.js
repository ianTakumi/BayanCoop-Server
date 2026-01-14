import { supabase } from "../utils/supabase_client.js";

export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const offset = (page - 1) * limit;

    // Build base query - GET ALL PRODUCTS regardless of status
    let query = supabase
      .from("products")
      .select(
        `
        *,
        category:categories(id, name),
        products_attributes(
          *,
          attribute:attributes(name)
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });
    // Apply search filter

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);
    const { data, error, count } = await query;

    if (error) throw error;
    console.log(data);

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

export const getAllProductsBasedOnCoopId = async (req, res) => {
  try {
    const { coopId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = "",
      category_id,
      min_price,
      max_price,
      in_stock_only = "false",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build base query - GET ALL PRODUCTS regardless of status
    let query = supabase
      .from("products")
      .select(
        `
        *,
        category:categories(id, name),
        products_attributes(
          *,
          attribute:attributes(name)
        )
      `,
        { count: "exact" }
      )
      .eq("coop_id", coopId)
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    // Price filtering - through product attributes
    if (min_price || max_price) {
      query = query.or(
        `products_attributes.price.gte.${
          min_price || 0
        },products_attributes.price.lte.${max_price || 999999}`
      );
    }

    // In stock filtering - Note: for archived products, we might want to ignore this
    if (in_stock_only === "true") {
      query = query.or(`products_attributes.stock.gt.0`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to match frontend expectations
    const transformedData = (data || []).map((product) => {
      const attributes = product.products_attributes || [];
      const activeAttributes = attributes.filter((a) => a.stock > 0);

      // Determine if product is archived
      const isArchived =
        product.status === "archived" || product.archived_at !== null;

      // Calculate price range from attributes
      let priceRange = {};
      if (attributes.length > 0) {
        const prices = attributes.map((a) => a.price).filter((p) => p != null);
        if (prices.length > 0) {
          priceRange = {
            min: Math.min(...prices),
            max: Math.max(...prices),
          };
        }
      }

      // Calculate total stock from attributes
      let totalStock = 0;
      let stockStatus = "UNKNOWN";

      if (attributes.length > 0) {
        // Sum stock from all attributes
        totalStock = attributes.reduce(
          (sum, attr) => sum + (attr.stock || 0),
          0
        );

        // Check if any attribute has stock
        const anyInStock = attributes.some((a) => (a.stock || 0) > 0);
        const allOutOfStock =
          attributes.length > 0 && attributes.every((a) => (a.stock || 0) <= 0);

        if (allOutOfStock) {
          stockStatus = "OUT_OF_STOCK";
        } else if (anyInStock) {
          // Check for low stock attributes
          const lowStockAttrs = attributes.filter(
            (a) => (a.stock || 0) > 0 && (a.stock || 0) <= 10
          );
          stockStatus = lowStockAttrs.length > 0 ? "LOW_STOCK" : "IN_STOCK";
        }
      }

      // Calculate total value
      let totalValue = 0;
      if (attributes.length > 0) {
        totalValue = attributes.reduce(
          (sum, attr) => sum + (attr.price || 0) * (attr.stock || 0),
          0
        );
      }

      // Get unique SKUs
      const skus = [
        ...new Set(attributes.map((a) => a.SKU).filter((sku) => sku)),
      ];

      return {
        ...product,
        products_attributes: attributes, // Keep original structure
        price_range: priceRange,
        stock_status: stockStatus,
        total_stock: totalStock,
        total_value: totalValue,
        total_attributes: attributes.length,
        active_attributes: activeAttributes.length,
        available_skus: skus,
        // For display purposes
        display_price:
          attributes.length === 0
            ? 0
            : priceRange.min === priceRange.max
            ? priceRange.min
            : `${priceRange.min} - ${priceRange.max}`,
        // Add is_archived flag for frontend filtering
        is_archived: isArchived ? 1 : 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: transformedData,
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

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*),
        products_attributes(
          *,
          attribute:attributes(name)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Calculate price range from attributes
    let priceRange = {};
    const attributes = product.products_attributes || [];

    if (attributes.length > 0) {
      const prices = attributes.map((a) => a.price).filter((p) => p != null);
      if (prices.length > 0) {
        priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices),
        };
      }
    }

    // Calculate total stock
    const totalStock = attributes.reduce(
      (sum, attr) => sum + (attr.stock || 0),
      0
    );

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: {
        ...product,
        price_range: priceRange,
        total_stock: totalStock,
      },
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

export const createProduct = async (req, res) => {
  try {
    const { coopId } = req.params;
    const productData = req.body;

    // Validate required fields
    if (
      !productData.name ||
      !productData.category_id ||
      !productData.description ||
      !productData.images
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, category, description, and images are required",
      });
    }

    // Prepare product data
    const newProduct = {
      coop_id: coopId,
      name: productData.name.trim(),
      description: productData.description?.trim() || "",
      category_id: productData.category_id,
      unit_type: productData.unit_type || "piece",
      images: productData.images || [],
      is_featured: productData.is_featured || false,
      is_best_seller: productData.is_best_seller || false,
      is_new_arrival: productData.is_new_arrival || false,
      status: productData.status || "active",
    };

    console.log("📦 Inserting product:", newProduct);

    const { data: product, error } = await supabase
      .from("products")
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating product:", error);
      throw error;
    }

    console.log("✅ Product created:", product.id);

    console.log("🔄 Creating product attributes...");

    const attributes = productData.products_attributes.map((attr) => {
      console.log("Product attribute data:", attr);

      return {
        product_id: product.id,
        attribute_id: attr.attribute_id,
        SKU:
          attr.SKU ||
          `SKU-${product.id.slice(0, 8)}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        attribute_value: attr.attribute_value || null,
        price: parseFloat(attr.price) || 0,
        member_price: attr.member_price ? parseFloat(attr.member_price) : null,
        stock: parseInt(attr.stock) || 0,
      };
    });

    console.log("📦 Inserting product attributes:", attributes);

    const { data: createdAttributes, error: attributesError } = await supabase
      .from("products_attributes")
      .insert(attributes).select(`
          *,
          attribute:attributes(name)
        `);

    if (attributesError) {
      console.error("❌ Error creating product attributes:", attributesError);
      throw attributesError;
    }

    console.log(`✅ ${createdAttributes.length} product attributes created`);

    // Fetch the complete product with attributes
    const { data: completeProduct } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*),
        products_attributes(
          *,
          attribute:attributes(name)
        )
      `
      )
      .eq("id", product.id)
      .single();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: completeProduct,
    });
  } catch (err) {
    console.error("❌ Error creating product:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    console.log("📝 Updating product:", id);
    console.log("📝 Update data received:", {
      name: productData.name,
      attributes_count: productData.products_attributes?.length || 0,
    });

    // 1. Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Prepare product updates
    const productUpdates = {
      name: productData.name?.trim(),
      description: productData.description?.trim() || "",
      category_id: productData.category_id,
      unit_type: productData.unit_type,
      images: productData.images || [],
      is_featured: productData.is_featured || false,
      is_best_seller: productData.is_best_seller || false,
      is_new_arrival: productData.is_new_arrival || false,
      status: productData.status || "active",
      updated_at: new Date().toISOString(),
    };

    console.log("📦 Product updates:", productUpdates);

    // 3. Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(productUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Product update error:", updateError);
      throw updateError;
    }

    console.log("✅ Product updated:", updatedProduct.id);

    // 4. Handle product attributes if provided
    if (productData.products_attributes) {
      console.log(
        "🔄 Processing product attributes:",
        productData.products_attributes.length
      );

      // Get existing attributes to know which to delete
      const { data: existingAttributes } = await supabase
        .from("products_attributes")
        .select("id, SKU")
        .eq("product_id", id);

      const existingAttributeIds = existingAttributes?.map((a) => a.id) || [];
      const updatedAttributeIds = productData.products_attributes
        .map((a) => a.id)
        .filter((id) => id); // Only existing attribute IDs

      // Attributes to delete (exist in DB but not in update data)
      const attributesToDelete = existingAttributeIds.filter(
        (id) => !updatedAttributeIds.includes(id)
      );

      if (attributesToDelete.length > 0) {
        console.log("🗑️ Deleting product attributes:", attributesToDelete);
        await supabase
          .from("products_attributes")
          .delete()
          .in("id", attributesToDelete);
      }

      // Process each product attribute
      for (const attrData of productData.products_attributes) {
        console.log(
          "📝 Processing product attribute:",
          attrData.SKU || attrData.attribute_id
        );

        const attributeUpdate = {
          product_id: id,
          attribute_id: attrData.attribute_id,
          attribute_value: attrData.attribute_value || "",
          SKU:
            attrData.SKU ||
            `SKU-${id.slice(0, 8)}-${Math.random().toString(36).substr(2, 9)}`,
          price: parseFloat(attrData.price) || 0,
          member_price: attrData.member_price
            ? parseFloat(attrData.member_price)
            : null,
          stock: parseInt(attrData.stock) || 0,
          updated_at: new Date().toISOString(),
        };

        if (attrData.id) {
          // Update existing attribute
          console.log("✏️ Updating product attribute:", attrData.id);

          // Check if SKU is being changed and if it already exists
          if (attrData.SKU && attrData.SKU !== attrData.originalSku) {
            const { data: existingSku } = await supabase
              .from("products_attributes")
              .select("id")
              .eq("SKU", attrData.SKU)
              .neq("id", attrData.id)
              .single();

            if (existingSku) {
              return res.status(400).json({
                success: false,
                message: `SKU "${attrData.SKU}" already exists`,
              });
            }
          }

          await supabase
            .from("products_attributes")
            .update(attributeUpdate)
            .eq("id", attrData.id);
        } else {
          // Create new attribute
          console.log(
            "➕ Creating new product attribute:",
            attributeUpdate.SKU
          );

          // Check if SKU already exists
          if (attributeUpdate.SKU) {
            const { data: existingSku } = await supabase
              .from("products_attributes")
              .select("id")
              .eq("SKU", attributeUpdate.SKU)
              .single();

            if (existingSku) {
              return res.status(400).json({
                success: false,
                message: `SKU "${attributeUpdate.SKU}" already exists`,
              });
            }
          }

          const { data: newAttribute, error: attrError } = await supabase
            .from("products_attributes")
            .insert([attributeUpdate])
            .select()
            .single();

          if (attrError) {
            console.error("❌ Product attribute creation error:", attrError);
            continue;
          }
        }
      }
    }

    // 5. Return complete product with updated data
    const { data: completeProduct } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*),
        products_attributes(
          *,
          attribute:attributes(name)
        )
      `
      )
      .eq("id", id)
      .single();

    console.log("✅ Product update complete");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: completeProduct,
    });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const archiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { archive_reason } = req.body;

    const { data: product, error } = await supabase
      .from("products")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        archive_reason: archive_reason || "Archived by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Product archived successfully",
    });
  } catch (err) {
    console.error("Error archiving product: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const unarchiveProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("products")
      .update({
        status: "active",
        archived_at: null,
        archive_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res
      .status(200)
      .json({ message: "Product unarchived successfully", success: true });
  } catch (err) {
    console.error("Error unarchiving product: ", err);
    return res
      .status(500)
      .json({ message: "Server error", success: false, error: err.message });
  }
};

// ============ PRODUCT ATTRIBUTES ============
export const getProductAttributes = async (req, res) => {
  try {
    const { productId } = req.params;
    const { in_stock_only = "false" } = req.query;

    let query = supabase
      .from("products_attributes")
      .select(
        `
        *,
        attribute:attributes(name)
      `
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (in_stock_only === "true") {
      query = query.gt("stock", 0);
    }

    const { data: attributes, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Product attributes fetched successfully",
      data: attributes || [],
    });
  } catch (err) {
    console.error("Error getting product attributes: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createAttribute = async (req, res) => {
  try {
    const { productId } = req.params;
    const attributeData = req.body;

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate required fields
    if (!attributeData.attribute_id || !attributeData.price) {
      return res.status(400).json({
        success: false,
        message: "Attribute ID and price are required",
      });
    }

    // Check if SKU already exists
    if (attributeData.SKU) {
      const { data: existingSku } = await supabase
        .from("products_attributes")
        .select("id")
        .eq("SKU", attributeData.SKU)
        .single();

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    // Create product attribute
    const newAttribute = {
      product_id: productId,
      attribute_id: attributeData.attribute_id,
      SKU:
        attributeData.SKU ||
        `SKU-${productId.slice(0, 8)}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      price: parseFloat(attributeData.price) || 0,
      member_price: attributeData.member_price
        ? parseFloat(attributeData.member_price)
        : null,
      stock: parseInt(attributeData.stock) || 0,
    };

    const { data: attribute, error } = await supabase
      .from("products_attributes")
      .insert([newAttribute])
      .select(
        `
        *,
        attribute:attributes(name)
      `
      )
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Product attribute created successfully",
      data: attribute,
    });
  } catch (err) {
    console.error("Error creating product attribute: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateAttribute = async (req, res) => {
  try {
    const { attributeId } = req.params;
    const updates = req.body;

    // Check if product attribute exists
    const { data: existingAttribute, error: fetchError } = await supabase
      .from("products_attributes")
      .select("*")
      .eq("id", attributeId)
      .single();

    if (fetchError || !existingAttribute) {
      return res.status(404).json({
        success: false,
        message: "Product attribute not found",
      });
    }

    // If SKU is being updated, check if new SKU already exists
    if (updates.SKU && updates.SKU !== existingAttribute.SKU) {
      const { data: existingSku } = await supabase
        .from("products_attributes")
        .select("id")
        .eq("SKU", updates.SKU)
        .single();

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    // Update product attribute
    const { data: attribute, error } = await supabase
      .from("products_attributes")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attributeId)
      .select(
        `
        *,
        attribute:attributes(name)
      `
      )
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Product attribute updated successfully",
      data: attribute,
    });
  } catch (err) {
    console.error("Error updating product attribute: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateAttributeStock = async (req, res) => {
  try {
    const { attributeId } = req.params;
    const { adjustment, action } = req.body; // action: 'add', 'subtract', 'set'

    // Check if product attribute exists
    const { data: attribute, error: fetchError } = await supabase
      .from("products_attributes")
      .select("stock")
      .eq("id", attributeId)
      .single();

    if (fetchError || !attribute) {
      return res.status(404).json({
        success: false,
        message: "Product attribute not found",
      });
    }

    let newStock = attribute.stock;
    switch (action) {
      case "add":
        newStock += adjustment;
        break;
      case "subtract":
        newStock -= adjustment;
        if (newStock < 0) newStock = 0;
        break;
      case "set":
        newStock = adjustment;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action. Use 'add', 'subtract', or 'set'",
        });
    }

    // Update product attribute stock
    const { data: updatedAttribute, error } = await supabase
      .from("products_attributes")
      .update({
        stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attributeId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: updatedAttribute,
    });
  } catch (err) {
    console.error("Error updating stock: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// ============ BULK OPERATIONS ============
export const bulkUpdateStock = async (req, res) => {
  try {
    const { coopId } = req.params;
    const { updates } = req.body; // Array of { attribute_id, adjustment, action }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Updates array is required",
      });
    }

    const results = [];

    for (const update of updates) {
      try {
        if (update.attribute_id) {
          // Get current stock
          const { data: attribute } = await supabase
            .from("products_attributes")
            .select("stock")
            .eq("id", update.attribute_id)
            .single();

          if (attribute) {
            let newStock = attribute.stock;
            switch (update.action) {
              case "add":
                newStock += update.adjustment;
                break;
              case "subtract":
                newStock -= update.adjustment;
                if (newStock < 0) newStock = 0;
                break;
              case "set":
                newStock = update.adjustment;
                break;
            }

            // Update stock
            await supabase
              .from("products_attributes")
              .update({
                stock: newStock,
                updated_at: new Date().toISOString(),
              })
              .eq("id", update.attribute_id);

            results.push({ ...update, success: true, new_stock: newStock });
          } else {
            results.push({
              ...update,
              success: false,
              error: "Product attribute not found",
            });
          }
        } else {
          results.push({
            ...update,
            success: false,
            error: "Product attribute ID is required",
          });
        }
      } catch (err) {
        results.push({ ...update, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk stock update completed",
      data: results,
    });
  } catch (err) {
    console.error("Error in bulk update: ", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
