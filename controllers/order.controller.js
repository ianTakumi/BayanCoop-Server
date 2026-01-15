import { supabase } from "../utils/supabase_client.js";

const generateOrderNumber = async () => {
  const date = new Date();
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // Get today's count of orders
  const todayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact" })
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  const sequence = (todayOrders?.length || 0) + 1;
  const sequenceStr = sequence.toString().padStart(5, "0");

  return `ORD-${datePrefix}-${sequenceStr}`;
};

// Or for simple timestamp-based approach:
const generateTimestampOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `ORD${timestamp}`;
};

// Get all orders based on user(Customer) ID
export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
        success: false,
      });
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          product_attribute:products_attributes(
            *,  
            product:products(
              *,
              cooperative:cooperatives(*)
            )
          )
        )
      
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("Error fetching orders by user:", err);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: err.message,
    });
  }
};

// Get all orders based on coop ID with comprehensive data
export const getOrdersByCoop = async (req, res) => {
  try {
    const { coopId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      start_date,
      end_date,
      search,
      payment_method,
      payment_status,
    } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const startIndex = (pageInt - 1) * limitInt;

    // Build the base query
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items!inner(
          *,
          product_attribute:products_attributes(
            *,
            product:products(
              *,
              cooperative:cooperatives!inner(*)
            )
          )
        ),
        user:users(*)
      `
      )
      .eq("order_items.product_attribute.product.cooperative.id", coopId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("order_status", status);
    }

    if (payment_method) {
      query = query.eq("payment_method", payment_method);
    }

    if (payment_status) {
      query = query.eq("payment_status", payment_status);
    }

    if (start_date) {
      query = query.gte("created_at", start_date);
    }

    if (end_date) {
      query = query.lte("created_at", end_date);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,user.first_name.ilike.%${search}%,user.last_name.ilike.%${search}%,user.email.ilike.%${search}%`
      );
    }

    // Get total count
    const { count, error: countError } = await query.select("*", {
      count: "exact",
      head: true,
    });

    if (countError) throw countError;

    // Apply pagination
    query = query.range(startIndex, startIndex + limitInt - 1);

    // Execute query
    const { data: orders, error } = await query;

    if (error) throw error;

    // Transform data to group by order and include cooperative items only
    const transformedOrders = orders
      .map((order) => {
        // Filter order items for this cooperative only
        const coopItems = order.order_items.filter(
          (item) => item.product_attribute?.product?.cooperative?.id === coopId
        );

        // Calculate cooperative subtotal
        const coopSubtotal = coopItems.reduce((sum, item) => {
          return sum + item.quantity * item.unit_price;
        }, 0);

        return {
          id: order.id,
          order_number: order.order_number,
          order_date: order.order_date,
          order_status: order.order_status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          total_amount: order.total_amount,
          coop_subtotal: coopSubtotal,
          shipping_address: order.shipping_address,
          customer: order.user
            ? {
                id: order.user.id,
                first_name: order.user.first_name,
                last_name: order.user.last_name,
                email: order.user.email,
                phone: order.user.phone,
              }
            : null,
          items: coopItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            item_status: item.item_status,
            product: {
              name: item.product_attribute?.product?.name,
              attribute_value: item.product_attribute?.attribute_value,
              sku: item.product_attribute?.sku,
              image: item.product_attribute?.product?.images?.[0] || null,
            },
          })),
          created_at: order.created_at,
          updated_at: order.updated_at,
        };
      })
      .filter((order) => order.items.length > 0); // Only include orders with items from this cooperative

    // Get additional statistics for the cooperative
    const { data: stats, error: statsError } = await supabase
      .from("order_items")
      .select(
        `
        item_status,
        quantity,
        unit_price,
        order:orders!inner(order_status),
        product_attribute:products_attributes(
          product:products(
            cooperative:cooperatives!inner(id)
          )
        )
      `
      )
      .eq("product_attribute.product.cooperative.id", coopId);

    if (!statsError && stats) {
      const statsData = {
        total_orders: transformedOrders.length,
        pending_orders: transformedOrders.filter(
          (o) => o.order_status === "pending"
        ).length,
        confirmed_orders: transformedOrders.filter(
          (o) => o.order_status === "confirmed"
        ).length,
        processing_orders: transformedOrders.filter(
          (o) => o.order_status === "processing"
        ).length,
        shipped_orders: transformedOrders.filter(
          (o) => o.order_status === "shipped"
        ).length,
        delivered_orders: transformedOrders.filter(
          (o) => o.order_status === "delivered"
        ).length,
        cancelled_orders: transformedOrders.filter(
          (o) => o.order_status === "cancelled"
        ).length,
        total_revenue: transformedOrders.reduce(
          (sum, order) => sum + order.coop_subtotal,
          0
        ),
        cod_orders: transformedOrders.filter((o) => o.payment_method === "cod")
          .length,
        gcash_orders: transformedOrders.filter(
          (o) => o.payment_method === "gcash"
        ).length,
        total_items_sold: stats.reduce(
          (sum, item) =>
            sum +
            (item.order?.order_status !== "cancelled" ? item.quantity : 0),
          0
        ),
      };

      res.status(200).json({
        success: true,
        orders: transformedOrders,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitInt),
        },
        filters: {
          status,
          start_date,
          end_date,
          search,
          payment_method,
          payment_status,
        },
        statistics: statsData,
      });
    } else {
      res.status(200).json({
        success: true,
        orders: transformedOrders,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limitInt),
        },
        filters: {
          status,
          start_date,
          end_date,
          search,
          payment_method,
          payment_status,
        },
      });
    }
  } catch (err) {
    console.error("Error fetching orders by coop:", err);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: err.message,
    });
  }
};

// Get order details by ID for a specific cooperative
export const getOrderByIdForCoop = async (req, res) => {
  try {
    const { coopId, orderId } = req.params;

    // Get the order with all related data
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          product_attribute:products_attributes(
            *,
            product:products(
              *,
              cooperative:cooperatives!inner(*)
            )
          )
        ),
        user:users(*),
        order_history(
          *,
          admin_user:users(id, first_name, last_name)
        )
      `
      )
      .eq("id", orderId)
      .eq("order_items.product_attribute.product.cooperative.id", coopId)
      .single();

    if (error) throw error;

    if (!order) {
      return res.status(404).json({
        message: "Order not found or doesn't belong to this cooperative",
        success: false,
      });
    }

    // Filter items for this cooperative only
    const coopItems = order.order_items.filter(
      (item) => item.product_attribute?.product?.cooperative?.id === coopId
    );

    if (coopItems.length === 0) {
      return res.status(404).json({
        message: "No items found for this cooperative in the order",
        success: false,
      });
    }

    // Calculate cooperative totals
    const coopSubtotal = coopItems.reduce((sum, item) => {
      return sum + item.quantity * item.unit_price;
    }, 0);

    const transformedOrder = {
      id: order.id,
      order_number: order.order_number,
      order_date: order.order_date,
      order_status: order.order_status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_reference: order.payment_reference,
      payment_date: order.payment_date,
      shipping_address: order.shipping_address,
      shipping_method: order.shipping_method,
      shipping_status: order.shipping_status,
      tracking_number: order.tracking_number,
      estimated_delivery_date: order.estimated_delivery_date,
      actual_delivery_date: order.actual_delivery_date,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      service_fee: order.service_fee,
      total_amount: order.total_amount,
      coop_subtotal: coopSubtotal,
      customer_notes: order.customer_notes,
      admin_notes: order.admin_notes,
      customer: order.user
        ? {
            id: order.user.id,
            first_name: order.user.first_name,
            last_name: order.user.last_name,
            email: order.user.email,
            phone: order.user.phone,
            address: order.user.address,
          }
        : null,
      items: coopItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        item_status: item.item_status,
        product: {
          id: item.product_attribute?.product?.id,
          name: item.product_attribute?.product?.name,
          description: item.product_attribute?.product?.description,
          attribute_value: item.product_attribute?.attribute_value,
          sku: item.product_attribute?.sku,
          images: item.product_attribute?.product?.images || [],
          unit_type: item.product_attribute?.product?.unit_type,
        },
        cooperative: {
          id: item.product_attribute?.product?.cooperative?.id,
          name: item.product_attribute?.product?.cooperative?.name,
          image: item.product_attribute?.product?.cooperative?.image,
        },
      })),
      history:
        order.order_history?.map((history) => ({
          id: history.id,
          status: history.status,
          notes: history.notes,
          created_at: history.created_at,
          admin_user: history.admin_user
            ? {
                id: history.admin_user.id,
                name: `${history.admin_user.first_name} ${history.admin_user.last_name}`,
              }
            : null,
        })) || [],
      created_at: order.created_at,
      updated_at: order.updated_at,
      cancelled_at: order.cancelled_at,
      cancelled_reason: order.cancelled_reason,
    };

    res.status(200).json({
      success: true,
      order: transformedOrder,
    });
  } catch (err) {
    console.error("Error fetching order by ID for coop:", err);

    if (err.code === "PGRST116") {
      // Row not found
      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: err.message,
    });
  }
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      items,
      shipping_address,
      payment_method = "cod",
      notes,
      subtotal,
      delivery_fee = 50.0,
      service_fee = 0.0,
      total_amount,
    } = req.body;

    // Validate required fields
    if (!user_id || !items || !shipping_address || !total_amount) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: user_id, items, shipping_address, total_amount",
      });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    // 1. Generate order number using your existing function
    const orderNumber = await generateOrderNumber();

    // 2. Check stock availability for all items first
    for (const item of items) {
      const { data: productAttr, error: productError } = await supabase
        .from("products_attributes")
        .select(
          `
          *,
          product:products(
            *,
            cooperative:cooperatives(*)
          )
        `
        )
        .eq("id", item.product_attribute_id)
        .single();

      if (productError || !productAttr) {
        return res.status(400).json({
          success: false,
          message: `Product attribute ${item.product_attribute_id} not found`,
        });
      }

      if (productAttr.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${productAttr.attribute_value}. Available: ${productAttr.stock}, Requested: ${item.quantity}`,
        });
      }
    }

    // 3. Create the order with generated order number
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id,
        order_number: orderNumber, // Add the generated order number
        shipping_address:
          typeof shipping_address === "string"
            ? shipping_address
            : JSON.stringify(shipping_address),
        payment_method,
        customer_notes: notes || null,
        subtotal: parseFloat(subtotal),
        delivery_fee: parseFloat(delivery_fee),
        service_fee: parseFloat(service_fee),
        total_amount: parseFloat(total_amount),
        order_status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: orderError.message,
      });
    }

    // 4. Create order items, update stock, and collect cart item IDs
    const orderItems = [];
    const cartItemsToDelete = [];

    for (const item of items) {
      // Get product details again to get cooperative_id
      const { data: productAttr } = await supabase
        .from("products_attributes")
        .select(
          `
          *,
          product:products(
            coop_id
          )
        `
        )
        .eq("id", item.product_attribute_id)
        .single();

      // Create order item
      const { data: orderItem, error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_attribute_id: item.product_attribute_id,
          cooperative_id: productAttr.product.coop_id,
          quantity: item.quantity,
          unit_price: item.unit_price || productAttr.price,
          item_status: "pending",
        })
        .select()
        .single();

      if (itemError) {
        // If we fail to create order item, we should delete the order
        await supabase.from("orders").delete().eq("id", order.id);

        return res.status(500).json({
          success: false,
          message: "Failed to create order item",
          error: itemError.message,
        });
      }

      orderItems.push(orderItem);

      // Add cart item ID to deletion list
      if (item.cart_item_id) {
        cartItemsToDelete.push(item.cart_item_id);
      }

      // Update product stock
      const { error: stockError } = await supabase
        .from("products_attributes")
        .update({
          stock: productAttr.stock - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.product_attribute_id);

      if (stockError) {
        // Rollback: delete order and order items
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        return res.status(500).json({
          success: false,
          message: "Failed to update product stock",
          error: stockError.message,
        });
      }
    }

    // 5. Delete cart items after successful order creation
    if (cartItemsToDelete.length > 0) {
      const { error: cartError } = await supabase
        .from("cart_items")
        .delete()
        .in("id", cartItemsToDelete);

      if (cartError) {
        console.error("Error deleting cart items:", cartError);
        // Don't fail the order if cart deletion fails
        // You can choose to log this or handle it differently
      }
    }

    // 6. Create initial order history
    const { error: historyError } = await supabase
      .from("order_history")
      .insert({
        order_id: order.id,
        status: "pending",
        notes: "Order created",
      });

    if (historyError) {
      console.error("Error creating order history:", historyError);
      // Don't fail the whole order if history fails
    }

    // 7. Get the complete order with all details
    const { data: completeOrder, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items(
          *,
          product_attribute:products_attributes(
            *,
            product:products(
              *,
              cooperative:cooperatives(*)
            )
          )
        ),
        user:users(*)
      `
      )
      .eq("id", order.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete order:", fetchError);
      // Still return success but with basic order data
      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        order: {
          ...order,
          items: orderItems,
          customer: null,
        },
      });
    }

    // Transform the order data
    const transformedOrder = {
      id: completeOrder.id,
      order_number: completeOrder.order_number,
      order_date: completeOrder.order_date,
      order_status: completeOrder.order_status,
      payment_method: completeOrder.payment_method,
      payment_status: completeOrder.payment_status,
      shipping_address: completeOrder.shipping_address,
      subtotal: completeOrder.subtotal,
      delivery_fee: completeOrder.delivery_fee,
      service_fee: completeOrder.service_fee,
      total_amount: completeOrder.total_amount,
      customer_notes: completeOrder.customer_notes,
      customer: completeOrder.user
        ? {
            id: completeOrder.user.id,
            first_name: completeOrder.user.first_name,
            last_name: completeOrder.user.last_name,
            email: completeOrder.user.email,
            phone: completeOrder.user.phone,
          }
        : null,
      items: completeOrder.order_items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        item_status: item.item_status,
        product: {
          name: item.product_attribute?.product?.name,
          attribute_value: item.product_attribute?.attribute_value,
          sku: item.product_attribute?.sku,
          image: item.product_attribute?.product?.images?.[0] || null,
        },
        cooperative: {
          id: item.product_attribute?.product?.cooperative?.id,
          name: item.product_attribute?.product?.cooperative?.name,
        },
      })),
      created_at: completeOrder.created_at,
    };

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: transformedOrder,
    });
  } catch (error) {
    console.error("Unexpected error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update order status (for cooperative to update their items)
export const updateOrderItemStatus = async (req, res) => {
  try {
    const { coopId, orderItemId } = req.params;
    const { item_status, notes } = req.body;

    if (!item_status) {
      return res.status(400).json({
        success: false,
        message: "item_status is required",
      });
    }

    // First verify the order item belongs to this cooperative
    const { data: orderItem, error: verifyError } = await supabase
      .from("order_items")
      .select(
        `
        *,
        product_attribute:products_attributes(
          product:products(
            cooperative:cooperatives!inner(id)
          )
        )
      `
      )
      .eq("id", orderItemId)
      .eq("product_attribute.product.cooperative.id", coopId)
      .single();

    if (verifyError || !orderItem) {
      return res.status(404).json({
        success: false,
        message: "Order item not found or does not belong to this cooperative",
      });
    }

    // Update the order item status
    const { data: updatedItem, error: updateError } = await supabase
      .from("order_items")
      .update({
        item_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderItemId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: "Failed to update order item status",
        error: updateError.message,
      });
    }

    // Add to order history
    await supabase.from("order_history").insert({
      order_id: orderItem.order_id,
      status: `item_${item_status}`,
      notes:
        notes ||
        `Order item ${orderItemId} status updated to ${item_status} by cooperative`,
    });

    res.status(200).json({
      success: true,
      message: "Order item status updated successfully",
      order_item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating order item status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
