import { supabase } from "../utils/supabase_client.js";

/**
 * Supplier Products Controller - EAV MODEL with status field
 * Handles all supplier product-related operations with new EAV schema
 */
const supplierProductsController = {
  /**
   * Get all supplier products with attributes
   * GET /api/supplier-products/
   */
  getAllProducts: async (req, res) => {
    try {
      const { status } = req.query;

      let query = supabase
        .from("supplier_products")
        .select(
          `
          *,
          supplier_product_attributes(*)
        `
        )
        .order("created_at", { ascending: false });

      // Filter by status if provided
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.status(200).json({
        message: "Successfully fetched all supplier products",
        success: true,
        data: data,
      });
    } catch (err) {
      console.error("Failed to fetch all supplier products:", err);
      res.status(500).json({
        message: "Something went wrong",
        success: false,
        error: err.message,
      });
    }
  },

  /**
   * Get products for a specific supplier with attributes
   * GET /api/supplier-products/supplier/:supplierId
   */
  getSupplierProducts: async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { page = 1, limit = 20, category, search, status } = req.query;
      const offset = (page - 1) * limit;

      console.log("=== GET SUPPLIER PRODUCTS ===");
      console.log("Supplier ID:", supplierId);

      // Build main query
      let query = supabase
        .from("supplier_products")
        .select(
          `
          *,
          supplier_product_attributes(*, attribute:attributes(*)),
          category:categories(id, name)
        `,
          { count: "exact" }
        )
        .eq("supplier_id", supplierId);

      // Apply filters - UPDATED: status instead of is_active
      if (status && status !== "all" && status !== "") {
        query = query.eq("status", status);
      }

      if (category && category !== "all") {
        query = query.eq("category_id", category);
      }

      if (search && search.trim() !== "") {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      // Apply pagination and ordering
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Execute query
      const { data: products, error, count } = await query;

      if (error) throw error;

      // Calculate stock status for each product
      const formattedProducts =
        products?.map((product, index) => {
          // Calculate total stock from attributes
          const totalStock =
            product.supplier_product_attributes?.reduce(
              (sum, attr) => sum + (parseInt(attr.stock_quantity) || 0),
              0
            ) || 0;

          // Get price range
          const prices = product.supplier_product_attributes?.map(
            (attr) => parseFloat(attr.price) || 0
          );
          const minPrice =
            prices?.length > 0
              ? Math.min(...prices)
              : parseFloat(product.base_price) || 0;
          const maxPrice =
            prices?.length > 0
              ? Math.max(...prices)
              : parseFloat(product.base_price) || 0;

          // Determine stock status based on stock quantity
          let stock_status = "in_stock";
          if (totalStock === 0) {
            stock_status = "out_of_stock";
          } else if (totalStock <= 10) {
            // Assuming min stock of 10
            stock_status = "low_stock";
          }

          return {
            idx: index + offset + 1,
            ...product,
            category_name: product.category?.name || "Uncategorized",
            current_stock: totalStock,
            min_stock_level: 10, // Default
            stock_status: stock_status,
            price_range: {
              min: minPrice,
              max: maxPrice,
            },
          };
        }) || [];

      res.status(200).json({
        success: true,
        data: formattedProducts,
        pagination: {
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((count || 0) / limit),
          has_next_page: offset + limit < (count || 0),
          has_prev_page: offset > 0,
        },
      });
    } catch (error) {
      console.error("Get supplier products error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching supplier products",
        error: error.message,
      });
    }
  },

  /**
   * Get a single supplier product with attributes
   * GET /api/supplier-products/:id
   */
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data: product, error } = await supabase
        .from("supplier_products")
        .select(
          `
          *,
          supplier_product_attributes(*, attribute:attributes(*)),
          category:categories(id, name),
          supplier:suppliers(id, name, business_name, email, phone)
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

      // Calculate total stock
      const totalStock =
        product.supplier_product_attributes?.reduce(
          (sum, attr) => sum + (parseInt(attr.stock_quantity) || 0),
          0
        ) || 0;

      res.status(200).json({
        success: true,
        data: {
          ...product,
          category_name: product.category?.name || "Uncategorized",
          total_stock: totalStock,
        },
      });
    } catch (error) {
      console.error("Get product by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching product",
        error: error.message,
      });
    }
  },

  /**
   * Create a new supplier product with attributes (EAV Model)
   * POST /api/supplier-products
   */
  createProduct: async (req, res) => {
    try {
      const {
        supplier_id,
        name,
        description,
        category_id,
        unit_type,
        min_order_quantity,
        images,
        storage_requirements,
        attributes = [], // Array of attribute objects
        status = "active", // Default to active
      } = req.body;
      console.log(req.body);
      console.log("Supplier ID:", supplier_id);
      console.log("Attributes:", attributes);

      // Validate required fields - REMOVED: base_price
      if (!supplier_id || !name || !category_id || !unit_type) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: supplier_id, name, category_id, unit_type",
        });
      }

      // Validate that at least one attribute is provided
      if (!attributes || attributes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one attribute is required",
        });
      }

      // Validate that each attribute has a price
      const invalidAttributes = attributes.filter(
        (attr) => !attr.price || isNaN(parseFloat(attr.price))
      );

      if (invalidAttributes.length > 0) {
        return res.status(400).json({
          success: false,
          message: "All attributes must have a valid price",
        });
      }

      // Validate status
      const validStatuses = [
        "active",
        "inactive",
        "out_of_stock",
        "low_stock",
        "pending",
        "archived",
      ];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Verify supplier exists
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplier_id)
        .single();

      if (!supplier) {
        return res.status(400).json({
          success: false,
          message: "Supplier not found",
        });
      }

      // Create product data - REMOVED: base_price
      const productData = {
        supplier_id,
        name,
        description: description || null,
        category_id,
        unit_type,
        min_order_quantity: parseInt(min_order_quantity) || 1,
        images: images || [],
        storage_requirements: storage_requirements || null,

        status: status || "active",
      };

      console.log("Product data:", productData);

      // Insert product
      const { data: product, error: productError } = await supabase
        .from("supplier_products")
        .insert([productData])
        .select()
        .single();

      if (productError) throw productError;

      console.log("Product created:", product.id);

      // Create attributes - required for EAV model
      const attributeData = attributes.map((attr, index) => ({
        product_id: product.id,
        attribute_id: attr.attribute_id,
        attribute_value: attr.attribute_value || "",
        price: parseFloat(attr.price) || 0,
        stock_quantity: parseInt(attr.stock_quantity) || 0,
        sku: attr.sku || null,
      }));

      console.log("Attribute data:", attributeData);

      const { error: attributeError } = await supabase
        .from("supplier_product_attributes")
        .insert(attributeData);

      if (attributeError) {
        console.error("Attribute insert error:", attributeError);
        // Rollback product creation if attributes fail
        await supabase.from("supplier_products").delete().eq("id", product.id);
        throw attributeError;
      }

      // Fetch complete product with attributes
      const { data: completeProduct } = await supabase
        .from("supplier_products")
        .select(
          `
        *,
        supplier_product_attributes(*, attribute:attributes(*))
      `
        )
        .eq("id", product.id)
        .single();

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: completeProduct,
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating product",
        error: error.message,
      });
    }
  },

  /**
   * Update a supplier product with attributes
   * PUT /api/supplier-products/:id
   */
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`=== UPDATE PRODUCT ${id} ===`);
      console.log("Update data:", updateData);

      // Check if product exists
      const { data: existingProduct } = await supabase
        .from("supplier_products")
        .select("id")
        .eq("id", id)
        .single();

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Prepare update data
      const productUpdateData = {
        updated_at: new Date().toISOString(),
      };

      // Copy allowed fields
      const allowedFields = [
        "name",
        "description",
        "category_id",
        "unit_type",
        "min_order_quantity",
        "images",
        "storage_requirements",
        "status", // UPDATED: status instead of is_active
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          productUpdateData[field] = updateData[field];
        }
      });

      // Validate status if provided
      if (productUpdateData.status) {
        const validStatuses = [
          "active",
          "inactive",
          "out_of_stock",
          "low_stock",
          "pending",
          "archived",
        ];
        if (!validStatuses.includes(productUpdateData.status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(
              ", "
            )}`,
          });
        }
      }

      // Handle numeric conversions
      if (productUpdateData.base_price !== undefined) {
        productUpdateData.base_price = parseFloat(productUpdateData.base_price);
      }
      if (productUpdateData.min_order_quantity !== undefined) {
        productUpdateData.min_order_quantity = parseInt(
          productUpdateData.min_order_quantity
        );
      }

      console.log("Product update data:", productUpdateData);

      // Update product
      const { data: updatedProduct, error: updateError } = await supabase
        .from("supplier_products")
        .update(productUpdateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Handle attributes update if provided
      if (updateData.attributes && Array.isArray(updateData.attributes)) {
        // First, delete existing attributes
        await supabase
          .from("supplier_product_attributes")
          .delete()
          .eq("product_id", id);

        // Insert new attributes
        if (updateData.attributes.length > 0) {
          const attributeData = updateData.attributes.map((attr) => ({
            product_id: id,
            attribute_id: attr.attribute_id,
            attribute_value: attr.attribute_value,
            price:
              parseFloat(attr.price) ||
              parseFloat(productUpdateData.base_price) ||
              0,
            stock_quantity: parseInt(attr.stock_quantity) || 0,
            sku: attr.sku || null,
          }));

          const { error: attributeError } = await supabase
            .from("supplier_product_attributes")
            .insert(attributeData);

          if (attributeError) {
            console.error("Attribute update error:", attributeError);
          }
        }
      }

      // Fetch complete updated product
      const { data: completeProduct } = await supabase
        .from("supplier_products")
        .select(
          `
          *,
          supplier_product_attributes(*, attribute:attributes(*))
        `
        )
        .eq("id", id)
        .single();

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: completeProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating product",
        error: error.message,
      });
    }
  },

  /**
   * Archive a supplier product - UPDATED to use status field
   * DELETE /api/supplier-products/:id
   */
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Check if product exists
      const { data: existingProduct } = await supabase
        .from("supplier_products")
        .select("id, status")
        .eq("id", id)
        .single();

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Archive the product by setting status to 'archived'
      const { error } = await supabase
        .from("supplier_products")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          archived_reason: reason || "Archived by supplier",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: "Product archived successfully",
      });
    } catch (error) {
      console.error("Archive product error:", error);
      res.status(500).json({
        success: false,
        message: "Error archiving product",
        error: error.message,
      });
    }
  },

  /**
   * Unarchive/Restore a supplier product - UPDATED to use status field
   * PUT /api/supplier-products/:id/unarchive
   */
  unarchiveProduct: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if product exists
      const { data: existingProduct } = await supabase
        .from("supplier_products")
        .select("id, status")
        .eq("id", id)
        .single();

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if product is already active
      if (existingProduct.status === "active") {
        return res.status(400).json({
          success: false,
          message: "Product is already active",
        });
      }

      // Restore the product by setting status to 'active'
      const { data: updatedProduct, error } = await supabase
        .from("supplier_products")
        .update({
          status: "active",
          archived_at: null,
          archived_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: "Product restored successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Unarchive product error:", error);
      res.status(500).json({
        success: false,
        message: "Error restoring product",
        error: error.message,
      });
    }
  },

  /**
   * Get product statistics - UPDATED for status field
   * GET /api/supplier-products/stats/:supplierId
   */
  getProductStats: async (req, res) => {
    try {
      const { supplierId } = req.params;

      // Get all products for this supplier with attributes
      const { data: products, error } = await supabase
        .from("supplier_products")
        .select(
          `
          *,
          supplier_product_attributes(stock_quantity)
        `
        )
        .eq("supplier_id", supplierId);

      if (error) throw error;

      // Calculate statistics using status field
      const activeProducts = products.filter((p) => p.status === "active");
      const archivedProducts = products.filter((p) => p.status === "archived");
      const inactiveProducts = products.filter((p) => p.status === "inactive");

      // Calculate stock counts from active products only
      let lowStockCount = 0;
      let outOfStockCount = 0;

      activeProducts.forEach((product) => {
        const totalStock =
          product.supplier_product_attributes?.reduce(
            (sum, attr) => sum + (parseInt(attr.stock_quantity) || 0),
            0
          ) || 0;

        if (totalStock === 0) {
          outOfStockCount++;
        } else if (totalStock <= 10) {
          lowStockCount++;
        }
      });

      const stats = {
        total_products: products.length,
        active_products: activeProducts.length,
        archived_products: archivedProducts.length,
        inactive_products: inactiveProducts.length,
        lowStockCount,
        outOfStockCount,
      };

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get product stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching product statistics",
        error: error.message,
      });
    }
  },

  /**
   * Get categories dropdown
   * GET /api/supplier-products/categories/dropdown
   */
  getCategoriesDropdown: async (req, res) => {
    try {
      const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .order("name", { ascending: true });

      if (error) throw error;

      // Add parent name for subcategories
      const categoriesWithParentName = categories.map((category) => {
        if (category.parent_id) {
          const parent = categories.find((c) => c.id === category.parent_id);
          return {
            ...category,
            parent_name: parent?.name || "Unknown",
          };
        }
        return category;
      });

      res.status(200).json({
        success: true,
        data: categoriesWithParentName,
      });
    } catch (error) {
      console.error("Get categories dropdown error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
    }
  },

  /**
   * Get attributes for a category
   * GET /api/supplier-products/attributes/category/:categoryId
   */
  getAttributesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;

      const { data: attributes, error } = await supabase
        .from("attributes")
        .select("*")
        .eq("category_id", categoryId)
        .order("name", { ascending: true });

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: attributes || [],
      });
    } catch (error) {
      console.error("Get attributes by category error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching attributes",
        error: error.message,
      });
    }
  },

  /**
   * Update product status directly
   * PUT /api/supplier-products/:id/status
   */
  updateProductStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // Validate status
      const validStatuses = [
        "active",
        "inactive",
        "out_of_stock",
        "low_stock",
        "pending",
        "archived",
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Check if product exists
      const { data: existingProduct } = await supabase
        .from("supplier_products")
        .select("id")
        .eq("id", id)
        .single();

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add archive data if status is archived
      if (status === "archived") {
        updateData.archived_at = new Date().toISOString();
        updateData.archived_reason = reason || "Archived";
      } else if (status === "active") {
        // Clear archive data when reactivating
        updateData.archived_at = null;
        updateData.archived_reason = null;
      }

      // Update product status
      const { data: updatedProduct, error } = await supabase
        .from("supplier_products")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: `Product status updated to ${status}`,
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Update product status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating product status",
        error: error.message,
      });
    }
  },
};

export default supplierProductsController;
