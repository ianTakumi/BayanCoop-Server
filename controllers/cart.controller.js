import { supabase } from "../utils/supabase_client.js";

// Get cart items for a specific user
export const getCartItems = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // STEP 1: Get the user's cart ID first
    const { data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (cartError) {
      if (cartError.code === "PGRST116") {
        return res.status(200).json({ cartItems: [], success: true });
      }
      throw cartError;
    }

    // STEP 2: Get cart items using the cart ID - FIXED THE TYPO
    const { data: cartItems, error: itemsError } = await supabase
      .from("cart_items")
      .select(
        `
        *,
        cooperative_product:coop_product_attribute_id (
          id,
          attribute_value,
          price,
          member_price,
          stock,
          SKU,
          product:product_id (
            name,
            unit_type,
            images,
            cooperative:coop_id (
              name,
              image
            )
          )
        ),
        supplier_product:supplier_product_attribute_id (
          id,
          attribute_value,
          price,
          stock_quantity,
          sku,
          product:product_id (
            name,
            unit_type,
            images,
            supplier:supplier_id (
              name,
              profile_image
            )
          )
        )
      `
      )
      .eq("cart_id", cartData.id)
      .order("added_at", { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    // STEP 3: Format the response - USE CORRECT ALIAS NAMES
    const formattedItems = cartItems.map((item) => {
      let productDetails = null;

      // Use the same alias names as in the query above
      if (item.product_source === "cooperative" && item.cooperative_product) {
        productDetails = {
          type: "cooperative",
          productAttributeId: item.cooperative_product.id,
          attributeValue: item.cooperative_product.attribute_value,
          price: item.cooperative_product.price,
          memberPrice: item.cooperative_product.member_price,
          stock: item.cooperative_product.stock,
          sku: item.cooperative_product.SKU,
          productName: item.cooperative_product.product?.name,
          unitType: item.cooperative_product.product?.unit_type,
          images: item.cooperative_product.product?.images,
          cooperativeName: item.cooperative_product.product?.cooperative?.name,
          cooperativeImage:
            item.cooperative_product.product?.cooperative?.image,
        };
      } else if (item.product_source === "supplier" && item.supplier_product) {
        productDetails = {
          type: "supplier",
          attributeValue: item.supplier_product.attribute_value,
          productAttributeId: item.supplier_product.id,
          price: item.supplier_product.price,
          stock: item.supplier_product.stock_quantity,
          sku: item.supplier_product.sku,
          productName: item.supplier_product.product?.name,
          unitType: item.supplier_product.product?.unit_type,
          images: item.supplier_product.product?.images,
          supplierName: item.supplier_product.product?.supplier?.name,
          supplierImage: item.supplier_product.product?.supplier?.profile_image,
        };
      }

      return {
        id: item.id,
        cartId: item.cart_id,
        productSource: item.product_source,
        quantity: item.quantity,
        addedAt: item.added_at,
        updatedAt: item.updated_at,
        product: productDetails,
      };
    });

    res.status(200).json({
      cartId: cartData.id,
      cartItems: formattedItems,
      success: true,
    });
  } catch (err) {
    console.error("Error fetching cart items:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Create cart item with duplicate check
export const createCartItem = async (req, res) => {
  try {
    const {
      quantity = 1,
      user_id,
      product_source = "cooperative",
      coop_product_attribute_id,
      supplier_product_attribute_id,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate product source and corresponding ID
    if (product_source === "cooperative" && !coop_product_attribute_id) {
      return res.status(400).json({
        error:
          "Cooperative product attribute ID is required for cooperative products",
      });
    }

    if (product_source === "supplier" && !supplier_product_attribute_id) {
      return res.status(400).json({
        error:
          "Supplier product attribute ID is required for supplier products",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than 0",
      });
    }

    // STEP 1: Get or create the user's cart
    let cartData;
    let cartError;

    ({ data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single());

    if (cartError) {
      if (cartError.code === "PGRST116") {
        // No cart found, create one
        const { data: newCart, error: createCartError } = await supabase
          .from("carts")
          .insert({ user_id })
          .single();

        if (createCartError) {
          console.error("Error creating cart:", createCartError);
          return res.status(500).json({
            error: "Failed to create cart",
            details: createCartError.message,
          });
        }
        cartData = newCart;
      } else {
        throw cartError;
      }
    }

    // STEP 2: Check if item already exists in cart
    const existingItemQuery = supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartData.id)
      .eq("product_source", product_source);

    // Add the appropriate product ID condition based on source
    if (product_source === "cooperative") {
      existingItemQuery.eq(
        "coop_product_attribute_id",
        coop_product_attribute_id
      );
    } else {
      existingItemQuery.eq(
        "supplier_product_attribute_id",
        supplier_product_attribute_id
      );
    }

    const { data: existingItem, error: existingItemError } =
      await existingItemQuery.single();

    // STEP 3: If item exists, update quantity; otherwise, create new item
    let cartItemData;

    if (existingItem && !existingItemError) {
      // Item exists, update quantity
      const newQuantity = existingItem.quantity + quantity;

      const { data: updatedItem, error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      cartItemData = updatedItem;

      res.status(200).json({
        cartItem: cartItemData,
        success: true,
        message: "Cart item quantity updated",
        action: "updated",
      });
    } else {
      // Item doesn't exist, create new
      const cartItemInsert = {
        cart_id: cartData.id,
        product_source,
        quantity,
      };

      // Add appropriate product reference based on source
      if (product_source === "cooperative") {
        cartItemInsert.coop_product_attribute_id = coop_product_attribute_id;
        cartItemInsert.supplier_product_attribute_id = null;
      } else {
        cartItemInsert.supplier_product_attribute_id =
          supplier_product_attribute_id;
        cartItemInsert.coop_product_attribute_id = null;
      }

      // Check stock availability before adding to cart
      if (product_source === "cooperative" && coop_product_attribute_id) {
        const { data: productStock, error: stockError } = await supabase
          .from("products_attributes")
          .select("stock")
          .eq("id", coop_product_attribute_id)
          .single();

        if (!stockError && productStock) {
          if (productStock.stock < quantity) {
            return res.status(400).json({
              error: `Insufficient stock. Only ${productStock.stock} items available`,
              available_stock: productStock.stock,
            });
          }
        }
      }

      if (product_source === "supplier" && supplier_product_attribute_id) {
        const { data: productStock, error: stockError } = await supabase
          .from("supplier_product_attributes")
          .select("stock_quantity")
          .eq("id", supplier_product_attribute_id)
          .single();

        if (!stockError && productStock) {
          if (productStock.stock_quantity < quantity) {
            return res.status(400).json({
              error: `Insufficient stock. Only ${productStock.stock_quantity} items available`,
              available_stock: productStock.stock_quantity,
            });
          }
        }
      }

      const { data: newCartItem, error: cartItemError } = await supabase
        .from("cart_items")
        .insert(cartItemInsert)
        .select()
        .single();

      if (cartItemError) {
        // Check if it's a foreign key constraint error
        if (cartItemError.code === "23503") {
          if (product_source === "cooperative") {
            return res.status(400).json({
              error: "Invalid cooperative product attribute ID",
            });
          } else {
            return res.status(400).json({
              error: "Invalid supplier product attribute ID",
            });
          }
        }
        throw cartItemError;
      }

      cartItemData = newCartItem;

      res.status(201).json({
        cartItem: cartItemData,
        success: true,
        message: "Cart item created successfully",
        action: "created",
      });
    }
  } catch (err) {
    console.error("Error creating cart item:", err);

    // Handle specific Supabase errors
    if (err.code === "23505") {
      // Unique constraint violation
      return res.status(409).json({
        error: "Item already exists in cart",
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
};

// Update cart item
export const updateCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!cartItemId) {
      return res.status(400).json({ error: "Cart Item ID is required" });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than 0",
      });
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartItemId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      cartItem: updatedItem,
      success: true,
      message: "Cart item updated successfully",
    });
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Remove cart item
export const removeCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;

    if (!cartItemId) {
      return res.status(400).json({ error: "Cart Item ID is required" });
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true, message: "Cart item removed" });
  } catch (err) {
    console.error("Error removing cart item:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
