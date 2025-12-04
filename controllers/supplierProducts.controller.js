import { supabase } from "../utils/supabase_client.js";
import { validationResult } from "express-validator";

/**
 * Supplier Products Controller
 * Handles all supplier product-related operations with Supabase
 */
const supplierProductsController = {
  /**
   * Get all products for a specific supplier
   * GET /api/supplier-products/supplier/:supplierId
   */
  getSupplierProducts: async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { page = 1, limit = 20, category, search, is_active } = req.query;
      const offset = (page - 1) * limit;

      console.log("=== GET SUPPLIER PRODUCTS START ===");
      console.log("Supplier ID:", supplierId);
      console.log("Query params:", {
        page,
        limit,
        category,
        search,
        is_active,
      });
      console.log("Offset:", offset, "Limit:", limit);

      // STEP 1: Check total products count for this supplier
      const { count: totalCount, error: countError } = await supabase
        .from("supplier_products")
        .select("*", { count: "exact", head: true })
        .eq("supplier_id", supplierId);

      if (countError) {
        console.error("Count error:", countError);
      }

      // STEP 3: Build the main query
      console.log("\n3. Building main query...");
      let query = supabase
        .from("supplier_products")
        .select(
          `
        *,
        inventory:supplier_inventory(*),
        prices:supplier_prices(
          *,
          cooperative:cooperatives(id, name)
        )
      `,
          { count: "exact" }
        )
        .eq("supplier_id", supplierId);

      // Apply is_active filter ONLY if explicitly provided
      if (is_active !== undefined && is_active !== "") {
        const isActiveBool = is_active === "true";
        console.log("Applying is_active filter:", isActiveBool);
        query = query.eq("is_active", isActiveBool);
      } else {
        console.log("No is_active filter applied (showing all products)");
      }

      // Apply category filter
      if (category && category !== "all") {
        console.log("Applying category filter:", category);
        query = query.eq("category", category);
      }

      // Apply search filter
      if (search && search.trim() !== "") {
        console.log("Applying search filter:", search);
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%,barcode.ilike.%${search}%`
        );
      }

      // Apply ordering and pagination
      console.log("\n4. Applying ordering and pagination...");
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // STEP 4: Execute the query
      console.log("\n5. Executing query...");
      const { data: products, error, count: filteredCount } = await query;

      console.log("Query executed. Results:");
      console.log("- Error:", error ? error.message : "None");
      console.log("- Products found:", products?.length || 0);
      console.log("- Filtered count:", filteredCount || 0);

      if (error) {
        console.error("Query execution error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      // STEP 5: Handle empty results
      if (!products || products.length === 0) {
        console.log("\n6. No products found with current filters");

        // Debug: Get all products without filters to see what's in DB
        const { data: allProductsDebug } = await supabase
          .from("supplier_products")
          .select("id, name, is_active, category, created_at")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false })
          .limit(5);

        console.log("Debug - First 5 products in DB:", allProductsDebug);

        return res.status(200).json({
          success: true,
          data: [],
          message: "No products found with the current filters",
          debug_info: {
            total_in_database: totalCount || 0,
            filters_applied: {
              is_active: is_active,
              category: category,
              search: search,
            },
            sample_products: allProductsDebug,
          },
          pagination: {
            total: filteredCount || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil((filteredCount || 0) / limit),
          },
        });
      }

      console.log(`\n6. Processing ${products.length} products...`);

      // STEP 6: Get categories for mapping
      const categoryIds = products
        .map((p) => p.category)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index); // Unique IDs

      console.log("Unique category IDs:", categoryIds);

      let categoryMap = {};
      if (categoryIds.length > 0) {
        const { data: categories, error: catError } = await supabase
          .from("categories")
          .select("id, name, parent_id")
          .in("id", categoryIds);

        if (catError) {
          console.error("Category fetch error:", catError);
        } else {
          categories.forEach((cat) => {
            categoryMap[cat.id] = cat;
          });
          console.log(`Fetched ${categories.length} categories`);
        }
      }

      // STEP 7: Format the response
      console.log("\n7. Formatting response...");
      const productsWithCategoryNames = products.map((product, index) => {
        const categoryInfo = product.category
          ? categoryMap[product.category]
          : null;
        const currentStock = product.inventory?.current_stock || 0;
        const minStockLevel = product.inventory?.min_stock_level || 10;

        return {
          idx: index + offset + 1,
          ...product,
          category_name: categoryInfo?.name || "Uncategorized",
          parent_category_id: categoryInfo?.parent_id || null,
          // Calculated fields for frontend
          stock_status:
            currentStock === 0
              ? "out_of_stock"
              : currentStock <= minStockLevel
              ? "low_stock"
              : "in_stock",
          current_stock: currentStock,
          min_stock_level: minStockLevel,
          // Format numeric fields
          base_price: parseFloat(product.base_price) || 0,
          weight_grams: product.weight_grams
            ? parseFloat(product.weight_grams)
            : null,
          // Current price from prices array
          current_price:
            product.prices?.find((p) => p.is_current)?.unit_price ||
            product.base_price,
        };
      });

      res.status(200).json({
        success: true,
        data: productsWithCategoryNames,
        supplier_info: {
          total_products: totalCount || 0,
        },
        filters_applied: {
          category: category || null,
          search: search || null,
          is_active: is_active || null,
          page: parseInt(page),
          limit: parseInt(limit),
        },
        pagination: {
          total: filteredCount || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((filteredCount || 0) / limit),
          has_next_page: offset + limit < (filteredCount || 0),
          has_prev_page: offset > 0,
        },
      });
    } catch (error) {
      console.error("=== GET SUPPLIER PRODUCTS ERROR ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      console.error("=== ERROR END ===");

      res.status(500).json({
        success: false,
        message: "Error fetching supplier products",
        error: error.message,
        details: error.details || null,
        code: error.code || null,
        hint: error.hint || null,
      });
    }
  },

  /**
   * Get a single supplier product by ID
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
          category_info:categories!inner(id, name, parent_id),
          parent_category:categories!categories_parent_id_fkey(id, name),
          inventory:supplier_inventory(*),
          prices:supplier_prices(
            *,
            cooperative:cooperatives(id, name)
          ),
          supplier:suppliers(id, business_name, contact_person, email, phone)
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

      // Format response with category names
      const formattedProduct = {
        ...product,
        category_name: product.category_info?.name || "Unknown Category",
        parent_category_name: product.parent_category?.name || null,
      };

      res.status(200).json({
        success: true,
        data: formattedProduct,
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
   * Create a new supplier product
   * POST /api/supplier-products
   */
  createProduct: async (req, res) => {
    try {
      const errors = validationResult(req);
      console.log(errors);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        supplier_id,
        name,
        description,
        category,
        unit_type,
        package_size,
        weight_grams,
        brand,
        barcode,
        images,
        base_price,
        min_order_quantity,
        moq_unit,
        lead_time_days,
        storage_requirements,
        shelf_life_days,
        certifications,
        tags,
        inventory_data,
      } = req.body;
      console.log("Req body", req.body);
      console.log("Inventory data", req.body.inventory_data);

      // Validate required fields
      if (!supplier_id) {
        return res.status(400).json({
          success: false,
          message: "Supplier ID is required",
        });
      }

      if (!name || !category || !unit_type || !base_price) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: name, category, unit_type, and base_price are required",
        });
      }

      console.log("Creating product for supplier:", supplier_id);

      // VERIFY SUPPLIER EXISTS
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id, business_name")
        .eq("id", supplier_id)
        .single();

      if (supplierError || !supplier) {
        console.error("Supplier not found:", supplier_id, supplierError);
        return res.status(400).json({
          success: false,
          message:
            "Supplier not found. Please check if supplier exists in database.",
          supplier_id: supplier_id,
        });
      }

      console.log("Supplier found:", supplier);

      // Validate category exists
      if (category) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", category)
          .single();

        if (categoryError || !categoryData) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
            category_id: category,
          });
        }
        console.log("Category found:", categoryData);
      }

      // Product data
      const productData = {
        supplier_id: supplier_id,
        name,
        description: description || null,
        category: category || null,
        unit_type,
        package_size: package_size || null,
        weight_grams: weight_grams || null,
        brand: brand || null,
        barcode: barcode || null,
        images: images || [],
        base_price: parseFloat(base_price),
        min_order_quantity: min_order_quantity || 1,
        moq_unit: moq_unit || "pcs",
        lead_time_days: lead_time_days || null,
        storage_requirements: storage_requirements || null,
        shelf_life_days: shelf_life_days || null,
        certifications: certifications || [],
        tags: tags || [],
        is_active: true,
      };

      console.log("Product data:", productData);

      // Insert product
      const { data: product, error: productError } = await supabase
        .from("supplier_products")
        .insert([productData])
        .select()
        .single();

      if (productError) {
        console.error("Product insert error:", productError);
        throw productError;
      }

      console.log("Product created:", product.id);

      // Create inventory
      const inventoryData = {
        supplier_product_id: product.id,
        current_stock: inventory_data?.current_stock || 0,
        reserved_stock: 0,
        min_stock_level: inventory_data?.min_stock_level || 10,
        max_stock_level: inventory_data?.max_stock_level || 100,
        batch_number: inventory_data?.batch_number || null,
        expiry_date: inventory_data?.expiry_date || null,
        location: inventory_data?.location || "Main Warehouse",
      };

      const { error: inventoryError } = await supabase
        .from("supplier_inventory")
        .insert([inventoryData]);

      if (inventoryError) {
        console.error("Inventory insert error:", inventoryError);
        // Don't throw, continue with product creation
      }

      // Create default price
      const priceData = {
        supplier_product_id: product.id,
        price_type: "default",
        unit_price: parseFloat(base_price),
        is_current: true,
      };

      const { error: priceError } = await supabase
        .from("supplier_prices")
        .insert([priceData]);

      if (priceError) {
        console.error("Price insert error:", priceError);
        // Don't throw, continue with product creation
      }

      // Fetch complete product data
      const { data: completeProduct, error: fetchError } = await supabase
        .from("supplier_products")
        .select(
          `
        *,
        category_info:categories(id, name),
        inventory:supplier_inventory(*),
        prices:supplier_prices(*)
      `
        )
        .eq("id", product.id)
        .single();

      if (fetchError) {
        console.error("Fetch product error:", fetchError);
        // Return basic product data if fetch fails
        return res.status(201).json({
          success: true,
          message: "Product created successfully (partial data)",
          data: product,
        });
      }

      // Format response
      const formattedProduct = {
        ...completeProduct,
        category_name:
          completeProduct.category_info?.name || "Unknown Category",
      };

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: formattedProduct,
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
   * Update a supplier product
   * PUT /api/supplier-products/:id
   */
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        unit_type,
        package_size,
        weight_grams,
        brand,
        barcode,
        images,
        base_price,
        min_order_quantity,
        moq_unit,
        lead_time_days,
        storage_requirements,
        shelf_life_days,
        certifications,
        tags,
        inventory_data,
      } = req.body;

      console.log(`=== UPDATE PRODUCT START ===`);
      console.log(`Product ID: ${id}`);
      console.log("Update data:", req.body);

      // Check if product exists
      const { data: existingProduct, error: checkError } = await supabase
        .from("supplier_products")
        .select("id, supplier_id, inventory:supplier_inventory(*)")
        .eq("id", id)
        .single();

      if (checkError || !existingProduct) {
        console.log("Product not found:", checkError);
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Validate category if being updated
      if (category) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", category)
          .single();

        if (categoryError || !categoryData) {
          console.log("Invalid category ID:", category);
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
            category_id: category,
          });
        }
        console.log("Category validated:", categoryData);
      }

      // Prepare update data - only update provided fields
      const updateData = {
        updated_at: new Date().toISOString(),
      };

      // Add fields if they exist in request
      if (name !== undefined) updateData.name = name;
      if (description !== undefined)
        updateData.description = description || null;
      if (category !== undefined) updateData.category = category || null;
      if (unit_type !== undefined) updateData.unit_type = unit_type;
      if (package_size !== undefined)
        updateData.package_size = package_size || null;
      if (weight_grams !== undefined)
        updateData.weight_grams = weight_grams || null;
      if (brand !== undefined) updateData.brand = brand || null;
      if (barcode !== undefined) updateData.barcode = barcode || null;
      if (images !== undefined) updateData.images = images || [];
      if (base_price !== undefined)
        updateData.base_price = parseFloat(base_price);
      if (min_order_quantity !== undefined)
        updateData.min_order_quantity = min_order_quantity || 1;
      if (moq_unit !== undefined) updateData.moq_unit = moq_unit || "pcs";
      if (lead_time_days !== undefined)
        updateData.lead_time_days = lead_time_days || null;
      if (storage_requirements !== undefined)
        updateData.storage_requirements = storage_requirements || null;
      if (shelf_life_days !== undefined)
        updateData.shelf_life_days = shelf_life_days || null;
      if (certifications !== undefined)
        updateData.certifications = certifications || [];
      if (tags !== undefined) updateData.tags = tags || [];

      console.log("Update data prepared:", updateData);

      // Update product
      const { data: updatedProduct, error: updateError } = await supabase
        .from("supplier_products")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Product update error:", updateError);
        throw updateError;
      }

      console.log("Product updated successfully:", updatedProduct.id);

      // Update inventory if inventory_data is provided
      if (inventory_data && Object.keys(inventory_data).length > 0) {
        console.log("Updating inventory data:", inventory_data);

        // Check if inventory exists
        const { data: existingInventory, error: invCheckError } = await supabase
          .from("supplier_inventory")
          .select("*")
          .eq("supplier_product_id", id)
          .single();

        const inventoryUpdateData = {
          updated_at: new Date().toISOString(),
        };

        // Add inventory fields if they exist in request
        if (inventory_data.current_stock !== undefined) {
          inventoryUpdateData.current_stock =
            parseInt(inventory_data.current_stock) || 0;
          inventoryUpdateData.last_restocked_at = new Date().toISOString();
        }
        if (inventory_data.min_stock_level !== undefined) {
          inventoryUpdateData.min_stock_level =
            parseInt(inventory_data.min_stock_level) || 10;
        }
        if (inventory_data.max_stock_level !== undefined) {
          inventoryUpdateData.max_stock_level =
            parseInt(inventory_data.max_stock_level) || 100;
        }
        if (inventory_data.batch_number !== undefined) {
          inventoryUpdateData.batch_number =
            inventory_data.batch_number || null;
        }
        if (inventory_data.expiry_date !== undefined) {
          inventoryUpdateData.expiry_date = inventory_data.expiry_date || null;
        }
        if (inventory_data.location !== undefined) {
          inventoryUpdateData.location =
            inventory_data.location || "Main Warehouse";
        }

        if (existingInventory) {
          // Update existing inventory
          const { error: inventoryUpdateError } = await supabase
            .from("supplier_inventory")
            .update(inventoryUpdateData)
            .eq("supplier_product_id", id);

          if (inventoryUpdateError) {
            console.error("Inventory update error:", inventoryUpdateError);
          } else {
            console.log("Inventory updated successfully");
          }
        } else {
          // Create new inventory
          const newInventoryData = {
            supplier_product_id: id,
            current_stock: parseInt(inventory_data.current_stock) || 0,
            reserved_stock: 0,
            min_stock_level: parseInt(inventory_data.min_stock_level) || 10,
            max_stock_level: parseInt(inventory_data.max_stock_level) || 100,
            batch_number: inventory_data.batch_number || null,
            expiry_date: inventory_data.expiry_date || null,
            location: inventory_data.location || "Main Warehouse",
          };

          const { error: inventoryCreateError } = await supabase
            .from("supplier_inventory")
            .insert([newInventoryData]);

          if (inventoryCreateError) {
            console.error("Inventory create error:", inventoryCreateError);
          } else {
            console.log("Inventory created successfully");
          }
        }
      }

      // Update price if base_price is changed
      if (base_price !== undefined) {
        console.log("Updating price for base_price change:", base_price);

        // First, set all current prices to false
        const { error: deactivateError } = await supabase
          .from("supplier_prices")
          .update({ is_current: false })
          .eq("supplier_product_id", id)
          .eq("price_type", "default");

        if (deactivateError) {
          console.error("Price deactivation error:", deactivateError);
        }

        // Create new price entry
        const newPriceData = {
          supplier_product_id: id,
          price_type: "default",
          unit_price: parseFloat(base_price),
          is_current: true,
        };

        const { error: priceCreateError } = await supabase
          .from("supplier_prices")
          .insert([newPriceData]);

        if (priceCreateError) {
          console.error("Price create error:", priceCreateError);
        } else {
          console.log("Price updated successfully");
        }
      }

      // Fetch complete updated product data
      const { data: completeProduct, error: fetchError } = await supabase
        .from("supplier_products")
        .select(
          `
          *,
          category_info:categories(id, name),
          inventory:supplier_inventory(*),
          prices:supplier_prices(*)
        `
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Fetch updated product error:", fetchError);
        // Return basic product data if fetch fails
        return res.status(200).json({
          success: true,
          message: "Product updated successfully (partial data)",
          data: updatedProduct,
        });
      }

      // Format response
      const formattedProduct = {
        ...completeProduct,
        category_name:
          completeProduct.category_info?.name || "Unknown Category",
      };

      console.log("=== UPDATE PRODUCT SUCCESS ===");
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: formattedProduct,
      });
    } catch (error) {
      console.error("=== UPDATE PRODUCT ERROR ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      console.error("=== ERROR END ===");

      res.status(500).json({
        success: false,
        message: "Error updating product",
        error: error.message,
        details: error.details || null,
      });
    }
  },

  /**
   *  Archive a supplier product
   * DELETE /api/supplier-products/:id
   */
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if product exists and belongs to supplier
      const { data: existingProduct, error: checkError } = await supabase
        .from("supplier_products")
        .select("supplier_id")
        .eq("id", id)
        .single();

      if (checkError || !existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Soft delete (archive) the product
      const { error: deleteError } = await supabase
        .from("supplier_products")
        .update({
          is_active: false,
          archived_at: new Date().toISOString(),
          archived_reason: req.body.reason || "Supplier deleted",
        })
        .eq("id", id);

      if (deleteError) throw deleteError;

      res.status(200).json({
        success: true,
        message: "Product archived successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        message: "Error archiving product",
        error: error.message,
      });
    }
  },

  unarchiveProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user; // Assuming user info is available from auth middleware

      console.log(`=== UNARCHIVE PRODUCT START ===`);
      console.log(`Product ID: ${id}`);
      console.log(`User ID: ${user?.id}`);

      // Check if product exists
      const { data: existingProduct, error: checkError } = await supabase
        .from("supplier_products")
        .select("id, supplier_id, is_active, archived_reason")
        .eq("id", id)
        .single();

      if (checkError || !existingProduct) {
        console.log("Product not found or error:", checkError);
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      console.log("Existing product:", {
        id: existingProduct.id,
        supplier_id: existingProduct.supplier_id,
        is_active: existingProduct.is_active,
        archived_reason: existingProduct.archived_reason,
      });

      // Check if product is already active
      if (existingProduct.is_active) {
        return res.status(400).json({
          success: false,
          message: "Product is already active",
        });
      }

      // Unarchive the product
      const { data: updatedProduct, error: updateError } = await supabase
        .from("supplier_products")
        .update({
          is_active: true,
          archived_at: null,
          archived_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Unarchive update error:", updateError);
        throw updateError;
      }

      console.log("Product unarchived successfully:", updatedProduct.id);

      res.status(200).json({
        success: true,
        message: "Product restored successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("=== UNARCHIVE PRODUCT ERROR ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
      console.error("Full error:", JSON.stringify(error, null, 2));
      console.error("=== ERROR END ===");

      res.status(500).json({
        success: false,
        message: "Error restoring product",
        error: error.message,
        details: error.details || null,
      });
    }
  },

  /**
   * Get product statistics for supplier dashboard - UPDATED to include archived count
   * GET /api/supplier-products/stats/:supplierId
   */
  getProductStats: async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { include_archived = false } = req.query;

      console.log(`=== GET PRODUCT STATS START ===`);
      console.log(`Supplier ID: ${supplierId}`);
      console.log(`Include archived: ${include_archived}`);

      // Get all products (both active and archived if requested)
      let query = supabase
        .from("supplier_products")
        .select(
          `
          *,
          category_info:categories(id, name),
          inventory:supplier_inventory(*)
        `,
          { count: "exact" }
        )
        .eq("supplier_id", supplierId);

      if (!include_archived) {
        query = query.eq("is_active", true);
      }

      const { data: allProducts, error: productsError, count } = await query;

      if (productsError) throw productsError;

      console.log(`Found ${count} products`);

      // Calculate counts
      const activeProducts = allProducts.filter((p) => p.is_active);
      const archivedProducts = allProducts.filter((p) => !p.is_active);

      const totalProducts = count || 0;
      const activeProductsCount = activeProducts.length;
      const archivedProductsCount = archivedProducts.length;

      // Calculate low stock from active products only
      const lowStockCount = activeProducts.filter(
        (product) =>
          product.inventory &&
          product.inventory.current_stock <= product.inventory.min_stock_level
      ).length;

      // Calculate out of stock from active products only
      const outOfStockCount = activeProducts.filter(
        (product) => product.inventory && product.inventory.current_stock === 0
      ).length;

      // Calculate products by category (from active products)
      const categories = {};
      activeProducts.forEach((item) => {
        const categoryName = item.category_info?.name || "Uncategorized";
        categories[categoryName] = (categories[categoryName] || 0) + 1;
      });

      // Get recent active products
      const { data: recentProducts, error: recentError } = await supabase
        .from("supplier_products")
        .select(
          `
          *,
          category_info:categories(id, name)
        `
        )
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Format recent products
      const formattedRecentProducts = recentProducts.map((product) => ({
        ...product,
        category_name: product.category_info?.name || "Unknown Category",
      }));

      res.status(200).json({
        success: true,
        data: {
          totalProducts,
          activeProducts: activeProductsCount,
          archivedProducts: archivedProductsCount,
          lowStockCount,
          outOfStockCount,
          categories,
          recentProducts: formattedRecentProducts,
        },
      });
    } catch (error) {
      console.error("=== GET PRODUCT STATS ERROR ===");
      console.error("Error:", error.message);
      res.status(500).json({
        success: false,
        message: "Error fetching product statistics",
        error: error.message,
      });
    }
  },
  /**
   * Update product inventory
   * PUT /api/supplier-products/:id/inventory
   */
  updateInventory: async (req, res) => {
    try {
      const { id } = req.params;
      const inventoryData = req.body;

      // Check if product exists
      const { data: product, error: productError } = await supabase
        .from("supplier_products")
        .select("id, supplier_id")
        .eq("id", id)
        .single();

      if (productError || !product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check inventory exists
      const { data: existingInventory, error: inventoryCheckError } =
        await supabase
          .from("supplier_inventory")
          .select("*")
          .eq("supplier_product_id", id)
          .single();

      let result;
      if (existingInventory) {
        // Update existing inventory
        const { data, error } = await supabase
          .from("supplier_inventory")
          .update({
            ...inventoryData,
            updated_at: new Date().toISOString(),
            last_restocked_at:
              inventoryData.current_stock !== undefined
                ? new Date().toISOString()
                : existingInventory.last_restocked_at,
          })
          .eq("supplier_product_id", id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new inventory
        const { data, error } = await supabase
          .from("supplier_inventory")
          .insert([
            {
              supplier_product_id: id,
              ...inventoryData,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Update inventory error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating inventory",
        error: error.message,
      });
    }
  },

  /**
   * Manage product prices
   * POST /api/supplier-products/:id/prices
   */
  managePrices: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        price_type = "default",
        coop_id = null,
        unit_price,
        min_quantity = 1,
        max_quantity = null,
        discount_percentage = 0,
        discount_amount = 0,
        effective_date = new Date().toISOString(),
        expiry_date = null,
        notes = "",
      } = req.body;

      // First, set all current prices for this combination to false
      const { error: deactivateError } = await supabase
        .from("supplier_prices")
        .update({ is_current: false })
        .eq("supplier_product_id", id)
        .eq("price_type", price_type)
        .eq("coop_id", coop_id);

      if (deactivateError) throw deactivateError;

      // Create new price entry
      const { data: newPrice, error: createError } = await supabase
        .from("supplier_prices")
        .insert([
          {
            supplier_product_id: id,
            coop_id,
            price_type,
            unit_price,
            min_quantity,
            max_quantity,
            discount_percentage,
            discount_amount,
            effective_date,
            expiry_date,
            notes,
            is_current: true,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      // Add to price history
      await supabase.from("supplier_price_history").insert([
        {
          supplier_price_id: newPrice.id,
          old_price: null,
          new_price: unit_price,
          change_reason: "Price created",
          changed_by: req.user.id,
        },
      ]);

      res.status(201).json({
        success: true,
        message: "Price updated successfully",
        data: newPrice,
      });
    } catch (error) {
      console.error("Manage prices error:", error);
      res.status(500).json({
        success: false,
        message: "Error managing prices",
        error: error.message,
      });
    }
  },

  /**
   * Get price history for a product
   * GET /api/supplier-products/:id/price-history
   */
  getPriceHistory: async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const {
        data: history,
        error,
        count,
      } = await supabase
        .from("supplier_price_history")
        .select(
          `
          *,
          changed_by_user:users(id, name, email),
          price:supplier_prices(
            *,
            cooperative:cooperatives(id, name)
          )
        `,
          { count: "exact" }
        )
        .eq("price.supplier_product_id", id)
        .order("changed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: history,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get price history error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching price history",
        error: error.message,
      });
    }
  },

  /**
   * Get categories for dropdown (supplier-specific)
   * GET /api/supplier-products/categories/dropdown
   */
  getCategoriesDropdown: async (req, res) => {
    try {
      // Fetch categories from categories table
      const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, is_archived")
        .eq("is_archived", false)
        .order("name", { ascending: true });

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: categories,
        meta: {
          total_categories: categories.length,
          include_archived: false,
          timestamp: new Date().toISOString(),
        },
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
   * Get products with category filtering
   * GET /api/supplier-products/supplier/:supplierId/filter
   */
  getFilteredProducts: async (req, res) => {
    try {
      const { supplierId } = req.params;
      const {
        category_id,
        search,
        min_price,
        max_price,
        in_stock_only = false,
      } = req.query;

      let query = supabase
        .from("supplier_products")
        .select(
          `
          *,
          category_info:categories(id, name, parent_id),
          inventory:supplier_inventory(*),
          prices:supplier_prices!inner(
            unit_price,
            is_current
          )
        `
        )
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .eq("prices.is_current", true);

      // Apply filters
      if (category_id) {
        query = query.eq("category", category_id);
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (min_price) {
        query = query.gte("prices.unit_price", parseFloat(min_price));
      }

      if (max_price) {
        query = query.lte("prices.unit_price", parseFloat(max_price));
      }

      if (in_stock_only === "true") {
        query = query.gt("inventory.current_stock", 0);
      }

      const { data: products, error } = await query;

      if (error) throw error;

      // Format response
      const formattedProducts = products.map((product) => ({
        ...product,
        category_name: product.category_info?.name || "Unknown Category",
        current_price: product.prices?.[0]?.unit_price || product.base_price,
      }));

      res.status(200).json({
        success: true,
        data: formattedProducts,
      });
    } catch (error) {
      console.error("Get filtered products error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching filtered products",
        error: error.message,
      });
    }
  },
};

export default supplierProductsController;
