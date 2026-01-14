import { supabase } from "../utils/supabase_client.js";

// Get all couriers with user info (working version)
export const getCouriers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // FIRST: Get just couriers with pagination and ordering
    let courierQuery = supabase.from("courier").select("*", { count: "exact" });

    // Apply filters to couriers
    if (status && status !== "all") {
      courierQuery = courierQuery.eq("status", status);
    }

    // Get paginated and ordered couriers
    const {
      data: couriers,
      error: courierError,
      count,
    } = await courierQuery
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (courierError) {
      console.error("Courier query error:", courierError);
      throw courierError;
    }

    // SECOND: Get user data for these couriers
    const userIds = couriers.map((c) => c.user_id).filter((id) => id);

    let users = [];
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .in("id", userIds);

      if (usersError) {
        console.error("Users query error:", usersError);
        throw usersError;
      }
      users = usersData || [];
    }

    // THIRD: Combine data and apply search filter if needed
    let combinedData = couriers.map((courier) => {
      const user = users.find((u) => u.id === courier.user_id);
      return {
        ...courier,
        user: user || null,
        // Add flattened user fields for easy access
        first_name: user?.first_name || null,
        last_name: user?.last_name || null,
        email: user?.email || null,
        phone: user?.phone || null,
        user_image: user?.image || null,
      };
    });

    // Apply search filter after combining data
    if (search) {
      combinedData = combinedData.filter((courier) => {
        const searchLower = search.toLowerCase();
        return (
          (courier.vehicle_type &&
            courier.vehicle_type.toLowerCase().includes(searchLower)) ||
          (courier.first_name &&
            courier.first_name.toLowerCase().includes(searchLower)) ||
          (courier.last_name &&
            courier.last_name.toLowerCase().includes(searchLower)) ||
          (courier.email &&
            courier.email.toLowerCase().includes(searchLower)) ||
          (courier.phone && courier.phone.toLowerCase().includes(searchLower))
        );
      });
    }

    // FOURTH: Get status counts
    const getCount = async (statusFilter = null) => {
      let countQuery = supabase
        .from("courier")
        .select("id", { count: "exact", head: true });
      if (statusFilter) countQuery = countQuery.eq("status", statusFilter);
      const { count } = await countQuery;
      return count || 0;
    };

    const [total, active, pending, inactive] = await Promise.all([
      getCount(),
      getCount("active"),
      getCount("pending"),
      getCount("inactive"),
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
        counts: { total, active, pending, inactive },
        filters: { status: status || "all", search: search || "" },
      },
      data: combinedData,
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

// Get single courier
export const getSingleCourierBasedOnId = async (req, res) => {
  try {
    const { courierId } = req.params;

    const { data, error } = await supabase
      .from("courier")
      .select("*")
      .eq("id", courierId)
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: "Courier fetched successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
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
      max_capacity,
      profile,
      license_front,
      license_back,
      vehicle_type,
      or_url,
      cr_url,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "dob",
      "phone",
      "email",
      "password",
      "max_capacity",
      "license_front",
      "license_back",
      "vehicle_type",
      "or_url",
      "cr_url",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: "Validation Error",
          error: `${field} is required`,
        });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Validation Error",
        error: "Invalid email format",
      });
    }

    // Validate phone number
    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({
        message: "Validation Error",
        error: "Phone number must be 10-15 digits",
      });
    }

    // Validate max capacity
    if (max_capacity <= 0 || max_capacity > 1000) {
      return res.status(400).json({
        message: "Validation Error",
        error: "Max capacity must be between 1 and 1000",
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
        message: "Validation Error",
        error: "Courier must be at least 18 years old",
      });
    }

    // Step 1: Check if email already exists in auth
    const { data: authUsers, error: authCheckError } =
      await supabase.auth.admin.listUsers();

    if (authCheckError) {
      console.error("Auth check error:", authCheckError);
      return res.status(500).json({
        message: "Server Error",
        error: "Failed to check existing users",
      });
    }

    // Check if email already exists
    const existingUser = authUsers.users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        message: "Validation Error",
        error: "Email already registered",
      });
    }

    // Step 2: Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
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
        message: "Auth Error",
        error: authError.message,
      });
    }

    const userId = authData.user.id;

    // Step 3: Create user record in users table
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email,
      role: "courier",
      dob: dob,
      status: "pending", // Courier needs approval
      email_verified: true,
      created_at: new Date().toISOString(),
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
        message: "User Creation Error",
        error: userError.message,
      });
    }

    // Step 4: Create courier record
    const { data: courierData, error: courierError } = await supabase
      .from("courier")
      .insert({
        user_id: userId,
        license_front,
        license_back,
        vehicle_type,
        or_url,
        cr_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
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
        message: "Courier Creation Error",
        error: courierError.message,
      });
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Courier registration submitted successfully",
      data: {
        user_id: userId,
        courier: courierData,
        next_steps: "Your application will be reviewed within 24-48 hours",
      },
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const archiveCourier = async (req, res) => {
  try {
    const { courierId } = req.params;
    const { archived_reason } = req.body;

    if (!courierId) {
      return res.status(400).json({
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .update({
        archived_at: new Date()
          .toISOString()
          .replace("Z", "")
          .replace("T", " "),
        archived_reason: archived_reason || null,
        updated_at: new Date().toISOString().replace("Z", "").replace("T", " "),
      })
      .eq("id", courierId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: "Courier archived successfully",
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};

export const unArchiveCourier = async (req, res) => {
  try {
    const { courierId } = req.params;

    if (!courierId) {
      return res.status(400).json({
        message: "Validation Error",
        error: "courierId is required",
      });
    }

    const { data, error } = await supabase
      .from("courier")
      .update({
        archived_at: null,
        archived_reason: null,
        updated_at: new Date().toISOString().replace("Z", "").replace("T", " "),
      })
      .eq("id", courierId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: "Courier unarchived successfully",
      data: data,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message,
    });
  }
};
