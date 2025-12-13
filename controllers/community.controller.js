import { supabase } from "../utils/supabase_client.js";

// Get communities with role-based filtering
export const getCommunities = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      privacy = "",
      page = 1,
      limit = 50, // Higher default for admin
      sort_by = "",
      is_admin = false,
    } = req.query;

    console.log("🔍 Request params:", {
      is_admin,
      search,
      status,
      privacy,
      sort_by,
    });

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("communities").select("*", { count: "exact" });

    // --- ROLE-BASED FILTERING ---
    const userIsAdmin = is_admin === "true" || req.user?.role === "admin";

    if (userIsAdmin) {
      console.log("👑 ADMIN VIEW - Showing ALL communities");

      // Admin: Apply filters ONLY if explicitly requested
      if (status) {
        console.log(`   Filtering by status: ${status}`);
        query = query.eq("status", status);
      }

      if (req.query.is_approved !== undefined) {
        const approvedValue = req.query.is_approved === "true";
        console.log(`   Filtering by is_approved: ${approvedValue}`);
        query = query.eq("is_approved", approvedValue);
      }

      // For privacy filter (if provided)
      if (privacy) {
        console.log(`   Filtering by privacy: ${privacy}`);
        query = query.eq("privacy", privacy);
      }
    } else {
      console.log("👤 USER VIEW - Showing approved/active communities only");

      // User: Always show only approved and active communities
      query = query.eq("is_approved", true);
      query = query.eq("status", "active");

      // Users can filter by privacy
      if (privacy) {
        console.log(`   Filtering by privacy: ${privacy}`);
        query = query.eq("privacy", privacy);
      }
    }

    // --- SEARCH (applies to both) ---
    if (search) {
      console.log(`   Searching for: "${search}"`);
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // --- SORTING ---
    const sortOptions = {
      newest: { column: "created_at", order: "desc" },
      oldest: { column: "created_at", order: "asc" },
      popular: { column: "total_members", order: "desc" },
      name: { column: "name", order: "asc" },
      // Admin-specific sorts
      last_active: { column: "updated_at", order: "desc" },
      pending: { column: "created_at", order: "asc" }, // For pending approvals
      members: { column: "total_members", order: "desc" },
      posts: { column: "post_count", order: "desc" },
    };

    // Admin: Apply sorting only if requested, otherwise default to newest
    if (sort_by && sortOptions[sort_by]) {
      const sortConfig = sortOptions[sort_by];
      console.log(
        `   Sorting by: ${sort_by} (${sortConfig.column} ${sortConfig.order})`
      );
      query = query.order(sortConfig.column, {
        ascending: sortConfig.order === "asc",
      });
    } else {
      // Default sorting
      const defaultSort = userIsAdmin
        ? { column: "created_at", order: "desc" } // Admin sees newest first
        : { column: "total_members", order: "desc" }; // User sees popular first

      console.log(
        `   Default sorting: ${defaultSort.column} ${defaultSort.order}`
      );
      query = query.order(defaultSort.column, {
        ascending: defaultSort.order === "asc",
      });
    }

    // Apply pagination
    console.log(`   Pagination: ${from}-${to} (page ${page}, limit ${limit})`);
    query = query.range(from, to);

    // Execute query
    const { data: communities, error, count } = await query;

    if (error) {
      console.error("❌ Query error:", error);
      throw error;
    }

    console.log(
      `✅ Found ${count} communities, returning ${communities?.length || 0}`
    );

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Prepare response
    const response = {
      success: true,
      data: communities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: totalPages,
      },
    };

    // Add admin metadata
    if (userIsAdmin) {
      response.meta = {
        view: "admin",
        filters_applied: {
          search: search || "none",
          status: status || "all",
          is_approved:
            req.query.is_approved !== undefined ? req.query.is_approved : "all",
          privacy: privacy || "all",
          sort_by: sort_by || "default (newest)",
        },
        stats: {
          total_communities: count,
          showing: communities?.length || 0,
        },
      };
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("🔥 Error fetching communities:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch communities",
      error: err.message,
    });
  }
};

export const createCommunity = async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      name,
      description,
      slug,
      image_url,
      banner_url,
      rules = null,
      privacy = "public",
      tags,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User id is required" });
    }

    if (
      !name ||
      !description ||
      !slug ||
      !image_url ||
      !banner_url ||
      !rules ||
      !privacy ||
      !tags
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill up all the fields" });
    }

    // Check if community name is existing
    const { data: existingName } = await supabase
      .from("communities")
      .select("id")
      .eq("name", name)
      .single();

    if (existingName) {
      return res
        .status(400)
        .json({ message: "Community name already exists", success: false });
    }

    // Check if community slug is existing
    const { data: existingSlug } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingSlug) {
      return res
        .status(400)
        .json({ message: "Community slug already exists", success: false });
    }

    const { data: community, error: communityError } = await supabase
      .from("communities")
      .insert({
        created_by: user_id,
        name,
        description,
        slug,
        image_url,
        banner_url,
        rules,
        privacy,
        tags: Array.isArray(tags) ? tags : [tags],
        status: "pending",
        is_approved: false,
        total_members: 0,
        male_count: 0,
        female_count: 0,
        post_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (communityError) throw communityError;

    // Auto add creator as admin
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({ community_id: community.id, user_id: user_id, role: "admin" });

    if (memberError) throw memberError;

    res
      .status(201)
      .json({ message: "Community created successfully", success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Something went wrong:" });
  }
};

export const updateCommunityStatus = async (req, res) => {
  try {
    const { status, is_approved } = req.body;
    const { community_id } = req.params;

    if (!status || !community_id || !is_approved) {
      return res
        .status(400)
        .json({ message: "Please fill up all the fields", success: false });
    }

    const { data, error } = await supabase
      .from("communities")
      .update({ status, is_approved })
      .eq("id", community_id)
      .select();

    if (error) throw error;

    console.log(data);
    res.status(200).json({
      success: false,
      message: "Successfully updated community status",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Something went wrong:" });
  }
};
