import { supabase } from "../utils/supabase_client.js";

// Get communities with role-based filtering (WITH JOINS)
export const getCommunities = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      page = 1,
      limit = 50,
      sort_by = "",
      is_admin = false,
    } = req.query;

    console.log("🔍 Request params:", {
      is_admin,
      search,
      status,
      sort_by,
    });

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build base query with joins
    let query = supabase.from("communities").select(
      `
        *,
        community_members!inner(
          id,
          user_id,
          role
        ),
        posts!left(
          id
        ),
        created_by_user:users!communities_created_by_fkey1(
          id,
          first_name,
          last_name,
          image
        )
      `,
      { count: "exact" },
    );

    // --- ROLE-BASED FILTERING ---
    const userIsAdmin = is_admin === "true";

    if (userIsAdmin) {
      console.log("👑 ADMIN VIEW - Showing ALL communities");

      if (status) {
        console.log(`   Filtering by status: ${status}`);
        query = query.eq("status", status);
      }
    } else {
      console.log("👤 USER VIEW - Showing active communities only");
      query = query.eq("status", "active");
    }

    // --- SEARCH ---
    if (search) {
      console.log(`   Searching for: "${search}"`);
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Execute query
    const { data: communities, error, count } = await query;

    if (error) {
      console.error("❌ Query error:", error);
      throw error;
    }

    console.log(
      `✅ Found ${count} communities, raw count: ${communities?.length || 0}`,
    );

    // Process data: Calculate counts
    const processedCommunities = communities.map((community) => {
      // Calculate member count
      const memberCount = community.community_members?.length || 0;

      // Calculate post count
      const postCount = community.posts?.length || 0;

      return {
        id: community.id,
        name: community.name,
        description: community.description,
        category: community.category,
        slug: community.slug,
        image_url: community.image_url,
        banner_url: community.banner_url,
        rules: community.rules,
        status: community.status,
        tags: community.tags,
        created_by: community.created_by,
        created_at: community.created_at,
        updated_at: community.updated_at,
        // Counts
        member_count: memberCount,
        post_count: postCount,
        // Owner info
        owner: community.created_by_user
          ? {
              id: community.created_by_user.id,
              name: `${community.created_by_user.first_name || ""} ${community.created_by_user.last_name || ""}`.trim(),
              image: community.created_by_user.image,
            }
          : null,
        // Additional metadata
        last_activity: community.updated_at,
      };
    });

    // --- SORTING ---
    const sortOptions = {
      newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      popular: (a, b) => b.member_count - a.member_count,
      name: (a, b) => a.name.localeCompare(b.name),
      active: (a, b) => new Date(b.last_activity) - new Date(a.last_activity),
      posts: (a, b) => b.post_count - a.post_count,
    };

    // Apply sorting
    let sortedCommunities = processedCommunities;
    if (sort_by && sortOptions[sort_by]) {
      console.log(`   Sorting by: ${sort_by}`);
      sortedCommunities = processedCommunities.sort(sortOptions[sort_by]);
    } else {
      // Default sorting
      const defaultSort = userIsAdmin ? "newest" : "popular";
      console.log(`   Default sorting: ${defaultSort}`);
      sortedCommunities = processedCommunities.sort(sortOptions[defaultSort]);
    }

    // Apply pagination
    const paginatedCommunities = sortedCommunities.slice(from, to + 1);

    console.log(
      `📊 Returning ${paginatedCommunities.length} communities after processing`,
    );

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Prepare response
    const response = {
      success: true,
      data: paginatedCommunities,
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

          sort_by: sort_by || "default (newest)",
        },
        stats: {
          total_communities: count,
          showing: paginatedCommunities.length,
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

// Get single community by slug with detailed info
export const getCommunityBasedOnSlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const user_id = req.user?.id;

    if (!slug) {
      return res
        .status(400)
        .json({ message: "Community slug is required", success: false });
    }

    // Get community with all related data
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select(
        `
        *,
        created_by_user:users!communities_created_by_fkey1(
          id,
          first_name,
          last_name,
          image,
          email
        ),
     
        community_members(
          id,
          user_id,
          role,
          created_at,
          joined_at,
          user:users(
            id,
            first_name,
            last_name,
            image,
            email
          )
        ),
        posts:posts!left(
          id,
          title,
          created_at,
          upvote_count,
          comment_count,
          view_count
        )
      `,
      )
      .eq("slug", slug)
      .single();

    if (communityError) {
      console.error("Community error:", communityError);
      if (communityError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Community not found",
        });
      }
      throw communityError;
    }

    // Check if user is a member
    let is_member = false;
    let user_role = null;
    let user_member_id = null;

    if (user_id && community.community_members) {
      const userMember = community.community_members.find(
        (member) => member.user_id === user_id,
      );
      is_member = !!userMember;
      user_role = userMember?.role || null;
      user_member_id = userMember?.id || null;
    }

    // Calculate counts
    const member_count = community.community_members?.length || 0;
    const post_count = community.posts?.length || 0;

    // Get moderator and admin lists
    const moderators =
      community.community_members
        ?.filter((member) => member.role === "moderator")
        .map((member) => ({
          id: member.user.id,
          name: `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim(),
          image: member.user.image,
          role: member.role,
          joined_at: member.joined_at,
        })) || [];

    const admins =
      community.community_members
        ?.filter((member) => member.role === "admin")
        .map((member) => ({
          id: member.user.id,
          name: `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim(),
          image: member.user.image,
          role: member.role,
          joined_at: member.joined_at,
        })) || [];

    // Get recent posts (limit to 5)
    const recent_posts =
      community.posts
        ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((post) => ({
          id: post.id,
          title: post.title,
          created_at: post.created_at,
          stats: {
            upvotes: post.upvote_count || 0,
            comments: post.comment_count || 0,
            views: post.view_count || 0,
          },
        })) || [];

    // Format response
    const response = {
      success: true,
      data: {
        id: community.id,
        name: community.name,
        description: community.description,
        slug: community.slug,
        image_url: community.image_url,
        banner_url: community.banner_url,
        rules: community.rules,
        status: community.status,
        tags: community.tags,
        created_at: community.created_at,
        updated_at: community.updated_at,
        archived_at: community.archived_at,

        // Owner info
        owner: {
          id: community.created_by_user?.id,
          name: `${community.created_by_user?.first_name || ""} ${community.created_by_user?.last_name || ""}`.trim(),
          image: community.created_by_user?.image,
          email: community.created_by_user?.email,
        },

        // Counts
        stats: {
          members: member_count,
          posts: post_count,
          moderators: moderators.length,
          admins: admins.length,
        },

        // User-specific data
        user_status: {
          is_member,
          role: user_role,
          member_id: user_member_id,
          can_post: is_member || community.created_by === user_id,
          can_moderate:
            user_role === "moderator" ||
            user_role === "admin" ||
            community.created_by === user_id,
        },

        // Leadership
        moderators,
        admins,

        // Recent activity
        recent_posts,

        // Additional metadata
        is_private: community.is_private || false,
        last_activity: community.updated_at,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching community:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err.message,
    });
  }
};

// Get communities owned by user
export const getCommunityBasedOnOwnerID = async (req, res) => {
  try {
    const { user_id } = req.params;
    const current_user_id = req.user?.id;

    if (!user_id) {
      return res
        .status(400)
        .json({ message: "User id is required", success: false });
    }

    // Check if requesting user can see private communities
    const canSeePrivate =
      current_user_id === user_id || req.user?.role === "admin";

    // Get communities with member and post counts
    const { data: communities, error: communityError } = await supabase
      .from("communities")
      .select(
        `
        *,
        community_members(count),
        posts(count),
        created_by_user:users!communities_created_by_fkey1(
          first_name,
          last_name,
          image
        )
      `,
      )
      .eq("created_by", user_id)
      .order("created_at", { ascending: false });

    if (communityError) throw communityError;

    // Process and filter communities
    const processedCommunities = communities
      .filter((community) => {
        // Filter out private communities if user doesn't have permission
        if (community.is_private && !canSeePrivate) {
          return false;
        }
        return true;
      })
      .map((community) => ({
        id: community.id,
        name: community.name,
        description: community.description,
        slug: community.slug,
        image_url: community.image_url,
        status: community.status,
        created_at: community.created_at,
        updated_at: community.updated_at,
        stats: {
          members: community.community_members[0]?.count || 0,
          posts: community.posts[0]?.count || 0,
        },
        owner: {
          id: user_id,
          name: `${community.created_by_user?.first_name || ""} ${community.created_by_user?.last_name || ""}`.trim(),
          image: community.created_by_user?.image,
        },
      }));

    res.status(200).json({
      data: processedCommunities,
      success: true,
      meta: {
        total: processedCommunities.length,
        user_id: user_id,
        can_see_private: canSeePrivate,
      },
    });
  } catch (err) {
    console.error("Error fetching user's communities:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err.message,
    });
  }
};

// NEW: Get user's joined communities
export const getUserJoinedCommunities = async (req, res) => {
  try {
    const { user_id } = req.params;
    const current_user_id = req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Check if user is viewing their own data or is admin
    const canView = user_id === current_user_id || req.user?.role === "admin";
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user's communities",
      });
    }

    // Get communities where user is a member
    const { data: memberships, error: membershipsError } = await supabase
      .from("community_members")
      .select(
        `
        id,
        role,
        joined_at,
        created_at,
        community:communities(
          id,
          name,
          description,
          slug,
          image_url,
          status,
          created_at,
          updated_at,
          community_members(count),
          posts(count),
          created_by_user:users!communities_created_by_fkey1(
            first_name,
            last_name,
            image
          )
        )
      `,
      )
      .eq("user_id", user_id)
      .order("joined_at", { ascending: false });

    if (membershipsError) throw membershipsError;

    // Process the data
    const communities = memberships
      .filter((membership) => membership.community) // Filter out null communities
      .map((membership) => {
        const community = membership.community;
        return {
          id: community.id,
          name: community.name,
          description: community.description,
          slug: community.slug,
          image_url: community.image_url,
          status: community.status,
          created_at: community.created_at,
          updated_at: community.updated_at,
          stats: {
            members: community.community_members[0]?.count || 0,
            posts: community.posts[0]?.count || 0,
          },
          membership: {
            id: membership.id,
            role: membership.role,
            joined_at: membership.joined_at,
            created_at: membership.created_at,
          },
          owner: community.created_by_user
            ? {
                name: `${community.created_by_user.first_name || ""} ${community.created_by_user.last_name || ""}`.trim(),
                image: community.created_by_user.image,
              }
            : null,
        };
      });

    res.status(200).json({
      success: true,
      data: communities,
      meta: {
        total: communities.length,
        user_id: user_id,
      },
    });
  } catch (err) {
    console.error("Error fetching user's joined communities:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch joined communities",
      error: err.message,
    });
  }
};

// NEW: Join community
export const joinCommunity = async (req, res) => {
  try {
    const { community_id } = req.params;
    const user_id = req.user?.id;

    if (!community_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Community ID and user authentication required",
      });
    }

    // Check if community exists and is joinable
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, status")
      .eq("id", community_id)
      .single();

    if (communityError) {
      if (communityError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Community not found",
        });
      }
      throw communityError;
    }

    if (community.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This community is not currently accepting new members",
      });
    }

    // Check if user is already a member
    const { data: existingMembership, error: checkError } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community_id)
      .eq("user_id", user_id)
      .single();

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this community",
      });
    }

    // Join the community
    const { data: membership, error: joinError } = await supabase
      .from("community_members")
      .insert({
        community_id,
        user_id,
        role: "member",
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (joinError) throw joinError;

    // Update community member count
    await supabase.rpc("increment_community_member_count", {
      community_id: community_id,
    });

    res.status(200).json({
      success: true,
      message: "Successfully joined the community",
      data: {
        membership_id: membership.id,
        community_id,
        user_id,
        role: membership.role,
        joined_at: membership.joined_at,
      },
    });
  } catch (err) {
    console.error("Error joining community:", err);
    res.status(500).json({
      success: false,
      message: "Failed to join community",
      error: err.message,
    });
  }
};

// NEW: Leave community
export const leaveCommunity = async (req, res) => {
  try {
    const { community_id } = req.params;
    const user_id = req.user?.id;

    if (!community_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Community ID and user authentication required",
      });
    }

    // Check if user is the community owner
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("created_by")
      .eq("id", community_id)
      .single();

    if (communityError) throw communityError;

    if (community.created_by === user_id) {
      return res.status(403).json({
        success: false,
        message:
          "Community owners cannot leave their own community. Transfer ownership first or delete the community.",
      });
    }

    // Check if user is a member
    const { data: membership, error: checkError } = await supabase
      .from("community_members")
      .select("id, role")
      .eq("community_id", community_id)
      .eq("user_id", user_id)
      .single();

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "You are not a member of this community",
      });
    }

    // Leave the community
    const { error: leaveError } = await supabase
      .from("community_members")
      .delete()
      .eq("id", membership.id);

    if (leaveError) throw leaveError;

    // Update community member count
    await supabase.rpc("decrement_community_member_count", {
      community_id: community_id,
    });

    res.status(200).json({
      success: true,
      message: "Successfully left the community",
      data: {
        community_id,
        user_id,
      },
    });
  } catch (err) {
    console.error("Error leaving community:", err);
    res.status(500).json({
      success: false,
      message: "Failed to leave community",
      error: err.message,
    });
  }
};

// NEW: Get community members with pagination
export const getCommunityMembers = async (req, res) => {
  try {
    const { community_id } = req.params;
    const { page = 1, limit = 50, search = "", role = "" } = req.query;

    if (!community_id) {
      return res.status(400).json({
        success: false,
        message: "Community ID is required",
      });
    }

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from("community_members")
      .select(
        `
        id,
        role,
        created_at,
        joined_at,
        user:users(
          id,
          first_name,
          last_name,
          email,
          image,
          created_at
        )
      `,
        { count: "exact" },
      )
      .eq("community_id", community_id);

    // Apply filters
    if (search) {
      query = query.or(
        `user.first_name.ilike.%${search}%,user.last_name.ilike.%${search}%,user.email.ilike.%${search}%`,
      );
    }

    if (role) {
      query = query.eq("role", role);
    }

    // Apply pagination and sorting
    query = query.order("joined_at", { ascending: false }).range(from, to);

    const { data: members, error, count } = await query;

    if (error) throw error;

    // Format response
    const formattedMembers = members.map((member) => ({
      id: member.id,
      role: member.role,
      joined_at: member.joined_at,
      created_at: member.created_at,
      user: {
        id: member.user.id,
        name: `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim(),
        email: member.user.email,
        image: member.user.image,
        member_since: member.user.created_at,
      },
    }));

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: formattedMembers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: totalPages,
      },
      meta: {
        community_id,
        filters: {
          search: search || "none",
          role: role || "all",
        },
      },
    });
  } catch (err) {
    console.error("Error fetching community members:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community members",
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
      !tags
    ) {
      console.log("Missing fields:", {
        name,
        description,
        slug,
        image_url,
        banner_url,
        rules,
        tags,
      });
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
        tags: Array.isArray(tags) ? tags : [tags],
        status: "pending",
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

export const updateCommunity = async (req, res) => {
  try {
    const { community_id } = req.params;
    const {
      name,
      description,
      category,
      rules,
      tags,
      status,
      image_url,
      banner_url,
      slug,
    } = req.body;

    console.log("📝 Update Community Request:", {
      community_id,
      name,
      description,
      category,
      status,
      image_url,
      banner_url,
      slug,
    });

    // Check if community exists
    const { data: existingCommunity, error: checkError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", community_id)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Community not found",
        });
      }
      throw checkError;
    }

    // Prepare update data
    const updateData = {};

    // Basic info fields
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (rules !== undefined) {
      updateData.rules = rules;
    }
    if (tags !== undefined) {
      // Handle tags - can be string or array
      updateData.tags = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
          ? JSON.parse(tags || "[]")
          : [];
    }

    // Status fields
    if (status !== undefined) {
      updateData.status = status;
    }

    // Media fields
    if (image_url !== undefined) {
      updateData.image_url = image_url;
    }
    if (banner_url !== undefined) {
      updateData.banner_url = banner_url;
    }

    // Slug - check for uniqueness if changed
    if (slug !== undefined && slug !== existingCommunity.slug) {
      // Check if new slug already exists
      const { data: slugExists } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", slug)
        .neq("id", community_id)
        .single();

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists. Please choose a different one.",
        });
      }
      updateData.slug = slug;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    console.log("📝 Update data to be saved:", updateData);

    // Perform update
    const { data: updatedCommunity, error: updateError } = await supabase
      .from("communities")
      .update(updateData)
      .eq("id", community_id)
      .select(
        `
    *,
    created_by_user:users!communities_created_by_fkey1(
      id,
      first_name,
      last_name,
      image
    )
  `,
      )
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      throw updateError;
    }

    console.log("✅ Community updated successfully:", updatedCommunity.id);

    // Format response
    const response = {
      success: true,
      message: "Community updated successfully",
      data: {
        id: updatedCommunity.id,
        name: updatedCommunity.name,
        description: updatedCommunity.description,
        category: updatedCommunity.category,
        slug: updatedCommunity.slug,
        image_url: updatedCommunity.image_url,
        banner_url: updatedCommunity.banner_url,
        rules: updatedCommunity.rules,
        status: updatedCommunity.status,
        tags: updatedCommunity.tags,
        created_by: updatedCommunity.created_by,
        created_at: updatedCommunity.created_at,
        updated_at: updatedCommunity.updated_at,

        // Owner info
        owner: updatedCommunity.created_by_user
          ? {
              id: updatedCommunity.created_by_user.id,
              name: `${updatedCommunity.created_by_user.first_name || ""} ${updatedCommunity.created_by_user.last_name || ""}`.trim(),
              image: updatedCommunity.created_by_user.image,
            }
          : null,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("🔥 Error updating community:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update community",
      error: err.message,
    });
  }
};

export const updateCommunityStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { community_id } = req.params;

    if (!status || !community_id) {
      return res
        .status(400)
        .json({ message: "Please fill up all the fields", success: false });
    }

    const { data, error } = await supabase
      .from("communities")
      .update({ status })
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
