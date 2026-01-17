import { supabase } from "../utils/supabase_client.js";

// Get all couriers with user info
export const getCouriers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Build the query with joins
    let query = supabase.from("courier").select(
      `
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          image,
          status,
          role,
          gender,
          dob,
          region,
          province,
          city,
          barangay,
          address
        ),
        cooperatives:cooperative_id (
          id,
          name,
          email,
          phone,
          address,
          barangay,
          city,
          region,
          province
        )
      `,
      { count: "exact" }
    );

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply archived filter (show only non-archived by default)
    const showArchived = req.query.archived === "true";
    if (!showArchived) {
      query = query.is("archived_at", null);
    }

    // Get paginated results
    const {
      data: couriers,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Courier query error:", error);
      throw error;
    }

    // Apply search filter after getting data
    let filteredCouriers = couriers || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCouriers = filteredCouriers.filter((courier) => {
        const user = courier.users;
        const cooperative = courier.cooperatives;

        return (
          (courier.vehicle_type &&
            courier.vehicle_type.toLowerCase().includes(searchLower)) ||
          (courier.vehicle_model &&
            courier.vehicle_model.toLowerCase().includes(searchLower)) ||
          (user?.first_name &&
            user.first_name.toLowerCase().includes(searchLower)) ||
          (user?.last_name &&
            user.last_name.toLowerCase().includes(searchLower)) ||
          (user?.email && user.email.toLowerCase().includes(searchLower)) ||
          (user?.phone && user.phone.toLowerCase().includes(searchLower)) ||
          (cooperative?.name &&
            cooperative.name.toLowerCase().includes(searchLower))
        );
      });
    }

    // Get status counts
    const getCount = async (statusFilter = null, archivedFilter = false) => {
      let countQuery = supabase
        .from("courier")
        .select("id", { count: "exact", head: true });

      if (statusFilter) {
        countQuery = countQuery.eq("status", statusFilter);
      }

      if (!archivedFilter) {
        countQuery = countQuery.is("archived_at", null);
      }

      const { count } = await countQuery;
      return count || 0;
    };

    const [total, active, pending, inactive, archived] = await Promise.all([
      getCount(),
      getCount("active"),
      getCount("pending"),
      getCount("inactive"),
      getCount(null, true), // Get all archived
    ]);

    return res.status(200).json({
      success: true,
      message: "Couriers fetched successfully",
      metadata: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
          has_next: offset + limit < (count || 0),
          has_previous: page > 1,
        },
        counts: {
          total: total - archived, // Active couriers
          active,
          pending,
          inactive,
          archived,
        },
        filters: {
          status: status || "all",
          search: search || "",
          archived: showArchived,
        },
      },
      data: filteredCouriers,
    });
  } catch (err) {
    console.error("Error fetching couriers:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get couriers based on cooperative ID
export const getCouriersBasedOnCoopId = async (req, res) => {
  try {
    const { cooperativeId } = req.params;
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (!cooperativeId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "cooperativeId is required",
      });
    }

    // Verify cooperative exists and get basic info
    const { data: cooperative, error: coopError } = await supabase
      .from("cooperatives")
      .select("id, name, email, phone, city, barangay, isApproved")
      .eq("id", cooperativeId)
      .single();

    if (coopError) {
      if (coopError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Cooperative not found",
        });
      }
      throw coopError;
    }

    // Build query for couriers in this cooperative
    let query = supabase
      .from("courier")
      .select(
        `
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            image,
            status,
            role,
            gender,
            dob,
            region,
            province,
            city,
            barangay,
            address
          )
        `,
        { count: "exact" }
      )
      .eq("cooperative_id", cooperativeId);

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply archived filter (show only non-archived by default)
    const showArchived = req.query.archived === "true";
    if (!showArchived) {
      query = query.is("archived_at", null);
    }

    // Get paginated results
    const {
      data: couriers,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Courier query error:", error);
      throw error;
    }

    // Apply search filter after getting data
    let filteredCouriers = couriers || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCouriers = filteredCouriers.filter((courier) => {
        const user = courier.users;
        return (
          (courier.vehicle_type &&
            courier.vehicle_type.toLowerCase().includes(searchLower)) ||
          (courier.vehicle_model &&
            courier.vehicle_model.toLowerCase().includes(searchLower)) ||
          (user?.first_name &&
            user.first_name.toLowerCase().includes(searchLower)) ||
          (user?.last_name &&
            user.last_name.toLowerCase().includes(searchLower)) ||
          (user?.email && user.email.toLowerCase().includes(searchLower)) ||
          (user?.phone && user.phone.toLowerCase().includes(searchLower))
        );
      });
    }

    // Get status counts for this cooperative
    const getCount = async (statusFilter = null) => {
      let countQuery = supabase
        .from("courier")
        .select("id", { count: "exact", head: true })
        .eq("cooperative_id", cooperativeId);

      if (statusFilter) {
        countQuery = countQuery.eq("status", statusFilter);
      }

      if (!showArchived) {
        countQuery = countQuery.is("archived_at", null);
      }

      const { count } = await countQuery;
      return count || 0;
    };

    const [total, active, pending, inactive] = await Promise.all([
      getCount(),
      getCount("active"),
      getCount("pending"),
      getCount("inactive"),
    ]);

    // Get archived count separately
    const { count: archivedCount } = await supabase
      .from("courier")
      .select("id", { count: "exact", head: true })
      .eq("cooperative_id", cooperativeId)
      .not("archived_at", "is", null);

    return res.status(200).json({
      success: true,
      message: `Couriers for ${cooperative.name} fetched successfully`,
      metadata: {
        cooperative: {
          id: cooperative.id,
          name: cooperative.name,
          email: cooperative.email,
          phone: cooperative.phone,
          city: cooperative.city,
          barangay: cooperative.barangay,
          isApproved: cooperative.isApproved,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
          has_next: offset + limit < (count || 0),
          has_previous: page > 1,
        },
        counts: {
          total,
          active,
          pending,
          inactive,
          archived: archivedCount || 0,
        },
        filters: {
          status: status || "all",
          search: search || "",
          archived: showArchived,
        },
      },
      data: filteredCouriers,
    });
  } catch (err) {
    console.error("Error fetching couriers by cooperative ID:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Also add a simpler version for getting just courier count by cooperative
export const getCourierCountByCoopId = async (req, res) => {
  try {
    const { cooperativeId } = req.params;

    if (!cooperativeId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "cooperativeId is required",
      });
    }

    // Get all counts in parallel
    const [total, active, pending, inactive] = await Promise.all([
      // Total non-archived
      supabase
        .from("courier")
        .select("id", { count: "exact", head: true })
        .eq("cooperative_id", cooperativeId)
        .is("archived_at", null),
      // Active
      supabase
        .from("courier")
        .select("id", { count: "exact", head: true })
        .eq("cooperative_id", cooperativeId)
        .eq("status", "active")
        .is("archived_at", null),
      // Pending
      supabase
        .from("courier")
        .select("id", { count: "exact", head: true })
        .eq("cooperative_id", cooperativeId)
        .eq("status", "pending")
        .is("archived_at", null),
      // Inactive
      supabase
        .from("courier")
        .select("id", { count: "exact", head: true })
        .eq("cooperative_id", cooperativeId)
        .eq("status", "inactive")
        .is("archived_at", null),
    ]);

    // Get cooperative name
    const { data: cooperative } = await supabase
      .from("cooperatives")
      .select("name")
      .eq("id", cooperativeId)
      .single();

    return res.status(200).json({
      success: true,
      message: "Courier counts fetched successfully",
      data: {
        cooperative: {
          id: cooperativeId,
          name: cooperative?.name || "Unknown Cooperative",
        },
        counts: {
          total: total.count || 0,
          active: active.count || 0,
          pending: pending.count || 0,
          inactive: inactive.count || 0,
        },
      },
    });
  } catch (err) {
    console.error("Error fetching courier counts:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get single courier by ID
export const getSingleCourierBasedOnId = async (req, res) => {
  try {
    const { courierId } = req.params;

    const { data, error } = await supabase
      .from("courier")
      .select(
        `
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          image,
          status,
          role,
          gender,
          dob,
          region,
          province,
          city,
          barangay,
          address,
          created_at
        ),
        cooperatives:cooperative_id (
          id,
          name,
          email,
          phone,
          address,
          barangay,
          city,
          region,
          province,
          image,
          isApproved
        )
      `
      )
      .eq("id", courierId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Courier not found",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: "Courier fetched successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error fetching courier:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Create courier
export const createCourier = async (req, res) => {
  try {
    // Destructure request body
    const {
      firstName,
      lastName,
      dob,
      phone,
      email,
      password,
      vehicle_type,
      vehicle_model,
      cooperative_id,
      gender,
    } = req.body;
    console.log(req.body);

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "dob",
      "phone",
      "email",
      "password",
      "vehicle_type",
      "vehicle_model",
      "cooperative_id",
    ];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Invalid email format",
      });
    }

    // Validate phone number
    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Phone number must be 10-15 digits",
      });
    }

    // Validate age (must be at least 18)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Courier must be at least 18 years old",
      });
    }

    // Check if cooperative exists
    const { data: cooperative, error: coopError } = await supabase
      .from("cooperatives")
      .select("id, isApproved")
      .eq("id", cooperative_id)
      .single();

    if (coopError) {
      return res.status(404).json({
        success: false,
        message: "Validation Error",
        error: "Cooperative not found",
      });
    }

    if (!cooperative.isApproved) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Cooperative is not approved",
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Email already registered",
      });
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          role: "courier",
        },
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({
        success: false,
        message: "Auth Error",
        error: authError.message,
      });
    }

    const userId = authData.user.id;

    // Step 2: Create user record in users table
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email,
      role: "courier",
      gender: gender,
      dob: dob,
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (userError) {
      // Rollback: delete auth user if users table insert fails
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error("Failed to rollback auth user:", deleteError);
      }

      console.error("User creation error:", userError);
      return res.status(400).json({
        success: false,
        message: "User Creation Error",
        error: userError.message,
      });
    }

    // Step 3: Create courier record
    const { data: courierData, error: courierError } = await supabase
      .from("courier")
      .insert({
        user_id: userId,
        cooperative_id: cooperative_id,
        vehicle_type: vehicle_type,
        vehicle_model: vehicle_model,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .single();

    if (courierError) {
      // Rollback: delete both auth user and users table record
      try {
        await supabase.from("users").delete().eq("id", userId);
        await supabase.auth.admin.deleteUser(userId);
      } catch (rollbackError) {
        console.error("Failed to rollback:", rollbackError);
      }

      console.error("Courier creation error:", courierError);
      return res.status(400).json({
        success: false,
        message: "Courier Creation Error",
        error: courierError.message,
      });
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Courier registration submitted successfully",
      data: courierData,
      next_steps: "Your application will be reviewed within 24-48 hours",
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update courier
export const updateCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    const updateData = req.body;

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    // Check if courier exists
    const { data: existingCourier, error: checkError } = await supabase
      .from("courier")
      .select("id, user_id")
      .eq("id", courierId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    // Prepare courier update data
    const courierUpdates = {};
    const userUpdates = {};

    // Separate courier and user updates
    Object.keys(updateData).forEach((key) => {
      if (
        ["vehicle_type", "vehicle_model", "status", "cooperative_id"].includes(
          key
        )
      ) {
        courierUpdates[key] = updateData[key];
      } else if (
        [
          "first_name",
          "last_name",
          "phone",
          "email",
          "gender",
          "dob",
          "region",
          "province",
          "city",
          "barangay",
          "address",
        ].includes(key)
      ) {
        userUpdates[key] = updateData[key];
      }
    });

    // Update user information if provided
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();

      const { error: userError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", existingCourier.user_id);

      if (userError) {
        throw userError;
      }
    }

    // Update courier information
    if (Object.keys(courierUpdates).length > 0) {
      courierUpdates.updated_at = new Date().toISOString();

      const { data: updatedCourier, error: courierError } = await supabase
        .from("courier")
        .update(courierUpdates)
        .eq("id", courierId)
        .select(
          `
          *,
          users:user_id (*),
          cooperatives:cooperative_id (*)
        `
        )
        .single();

      if (courierError) {
        throw courierError;
      }

      return res.status(200).json({
        success: true,
        message: "Courier updated successfully",
        data: updatedCourier,
      });
    }

    // If only user data was updated, fetch the updated courier
    const { data: updatedCourier } = await supabase
      .from("courier")
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .eq("id", courierId)
      .single();

    return res.status(200).json({
      success: true,
      message: "Courier updated successfully",
      data: updatedCourier,
    });
  } catch (err) {
    console.error("Error updating courier:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Update courier status
export const updateCourierStatus = async (req, res) => {
  try {
    const { courierId } = req.params;
    const { status } = req.body;

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    if (!status || !["pending", "active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "Valid status is required: pending, active, or inactive",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courierId)
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Courier not found",
        });
      }
      throw error;
    }

    // Also update user status if courier is being deactivated
    if (status === "inactive") {
      await supabase
        .from("users")
        .update({ status: "inactive" })
        .eq("id", data.user_id);
    }

    return res.status(200).json({
      success: true,
      message: `Courier status updated to ${status}`,
      data: data,
    });
  } catch (err) {
    console.error("Error updating courier status:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Archive courier
export const archiveCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    const { archived_reason } = req.body;

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .update({
        archived_at: new Date().toISOString(),
        archived_reason: archived_reason || "Archived by admin",
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", courierId)
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Courier not found",
        });
      }
      throw error;
    }

    // Also update user status
    await supabase
      .from("users")
      .update({ status: "inactive" })
      .eq("id", data.user_id);

    return res.status(200).json({
      success: true,
      message: "Courier archived successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error archiving courier:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Unarchive courier
export const unArchiveCourier = async (req, res) => {
  try {
    const { courierId } = req.params;

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .update({
        archived_at: null,
        archived_reason: null,
        status: "pending", // Reset to pending when unarchiving
        updated_at: new Date().toISOString(),
      })
      .eq("id", courierId)
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Courier not found",
        });
      }
      throw error;
    }

    // Also update user status
    await supabase
      .from("users")
      .update({ status: "pending" })
      .eq("id", data.user_id);

    return res.status(200).json({
      success: true,
      message: "Courier unarchived successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error unarchiving courier:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get courier by user ID
export const getCourierByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: "userId is required",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .select(
        `
        *,
        users:user_id (*),
        cooperatives:cooperative_id (*)
      `
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Courier not found for this user",
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: "Courier fetched successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error fetching courier by user ID:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
