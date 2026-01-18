import { supabase } from "../utils/supabase_client.js";

// Get all posts based on community id
export const getPostsByCommunity = async (req, res) => {
  try {
    const { community_id } = req.params;
    const { page = 1, limit = 10, post_type, sort_by = "newest" } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("posts")
      .select(
        `
        *,
        author:users(id, first_name, last_name, image),
        community:communities(id, name, slug, image_url)
      `,
      )
      .eq("community_id", community_id);

    // Filter by post type if provided
    if (post_type) {
      query = query.eq("post_type", post_type);
    }

    // Apply sorting
    if (sort_by === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sort_by === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else if (sort_by === "top") {
      query = query.order("upvote_count", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: posts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || posts?.length || 0,
        totalPages: Math.ceil((count || posts?.length || 0) / limit),
      },
    });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// Get single post by id
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching post with ID:", id);
    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        author:users(id, first_name, last_name, image),
        community:communities(id, name, slug, image_url, description),
        comments:post_comments(
          id,
          content,
          upvote_count,
          downvote_count,
          created_at,
          author:users(id, first_name, last_name, image)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }
      throw error;
    }

    // Increment view count
    await supabase
      .from("posts")
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq("id", id);

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// Create a new post
export const createPost = async (req, res) => {
  try {
    const {
      community_id,
      title,
      content,
      post_type = "text",
      url,
      image_urls,
      poll_options,
      author_id,
    } = req.body;

    // Validate required fields
    if (!community_id || !title) {
      return res.status(400).json({
        success: false,
        error: "Community ID and title are required",
      });
    }

    // Validate post type
    const validPostTypes = ["text", "link", "image", "poll", "video"];
    if (!validPostTypes.includes(post_type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid post type",
      });
    }

    // Check if community exists and user is a member
    const { data: communityMember, error: memberError } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community_id)
      .eq("user_id", author_id)
      .single();

    if (memberError || !communityMember) {
      return res.status(403).json({
        success: false,
        error: "You must be a member of this community to post",
      });
    }

    const postData = {
      community_id,
      author_id,
      title,
      content,
      post_type,
      url: post_type === "link" ? url : null,
      image_urls: post_type === "image" ? image_urls : null,
      poll_options: post_type === "poll" ? poll_options : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: post, error } = await supabase
      .from("posts")
      .insert([postData])
      .select(
        `
        *,
        author:users(id, first_name, last_name, image),
        community:communities(id, name, slug, image_url)
      `,
      )
      .single();

    if (error) throw error;

    // Increment post count in community_members
    await supabase
      .from("community_members")
      .update({ post_count: (communityMember.post_count || 0) + 1 })
      .eq("community_id", community_id)
      .eq("user_id", author_id);

    res.status(201).json({
      success: true,
      data: post,
      message: "Post created successfully",
    });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// Update a post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, url, image_urls, poll_options } = req.body;

    const author_id = req.user?.id;

    // Check if post exists and user is the author
    const { data: existingPost, error: postError } = await supabase
      .from("posts")
      .select("author_id, community_id")
      .eq("id", id)
      .single();

    if (postError || !existingPost) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check authorization (author or community admin/moderator)
    const isAuthor = existingPost.author_id === author_id;
    let isModerator = false;

    if (!isAuthor) {
      const { data: memberRole } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", existingPost.community_id)
        .eq("user_id", author_id)
        .in("role", ["admin", "moderator"])
        .single();

      isModerator = !!memberRole;
    }

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to update this post",
      });
    }

    const updateData = {
      title,
      content,
      url,
      image_urls,
      poll_options,
      updated_at: new Date().toISOString(),
    };

    // Remove null values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const { data: post, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        author:users(id, first_name, last_name, image),
        community:communities(id, name, slug, image_url)
      `,
      )
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: post,
      message: "Post updated successfully",
    });
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

export const toggleVote = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'upvote' or 'downvote'
    const userId = req.user.id; // From auth middleware

    // Validate request
    if (!type || !["upvote", "downvote"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote type. Must be 'upvote' or 'downvote'",
      });
    }

    // 1. Find the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (postError || !post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // 2. Check if user has already voted
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("*")
      .eq("post_id", id)
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle to return null if no record

    let result;
    let newUpvoteCount = post.upvote_count;
    let newDownvoteCount = post.downvote_count;

    // 3. Handle the voting logic
    if (existingVote) {
      // If user is voting the same type, remove the vote
      if (existingVote.type === type) {
        // Delete the vote
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) {
          throw new Error("Failed to remove vote");
        }

        // Update counts
        if (type === "upvote") {
          newUpvoteCount = Math.max(0, post.upvote_count - 1);
        } else {
          newDownvoteCount = Math.max(0, post.downvote_count - 1);
        }

        result = "removed";
      } else {
        // If user is changing vote type, update it
        const { error: updateError } = await supabase
          .from("votes")
          .update({ type: type })
          .eq("id", existingVote.id);

        if (updateError) {
          throw new Error("Failed to update vote");
        }

        // Update both counts
        if (type === "upvote") {
          newUpvoteCount = post.upvote_count + 1;
          newDownvoteCount = Math.max(0, post.downvote_count - 1);
        } else {
          newDownvoteCount = post.downvote_count + 1;
          newUpvoteCount = Math.max(0, post.upvote_count - 1);
        }

        result = "changed";
      }
    } else {
      // Create new vote
      const { error: insertError } = await supabase.from("votes").insert({
        post_id: id,
        user_id: userId,
        type: type,
      });

      if (insertError) {
        throw new Error("Failed to add vote");
      }

      // Update post count
      if (type === "upvote") {
        newUpvoteCount = post.upvote_count + 1;
      } else {
        newDownvoteCount = post.downvote_count + 1;
      }

      result = "added";
    }

    // 4. Update the post with new counts
    const { error: updatePostError } = await supabase
      .from("posts")
      .update({
        upvote_count: newUpvoteCount,
        downvote_count: newDownvoteCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updatePostError) {
      throw new Error("Failed to update post counts");
    }

    // 5. Get updated vote status for this user
    const { data: userVote } = await supabase
      .from("votes")
      .select("type")
      .eq("post_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    res.status(200).json({
      success: true,
      message: `Vote ${result} successfully`,
      data: {
        upvote_count: newUpvoteCount,
        downvote_count: newDownvoteCount,
        user_vote: userVote ? userVote.type : null,
      },
    });
  } catch (error) {
    console.error("Error toggling vote:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if post exists
    const { data: existingPost, error: postError } = await supabase
      .from("posts")
      .select("author_id, community_id")
      .eq("id", id)
      .single();

    if (postError || !existingPost) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check authorization (author or community admin/moderator)
    const isAuthor = existingPost.author_id === user_id;
    let isModerator = false;

    if (!isAuthor) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to delete this post",
      });
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) throw error;

    // Decrement post count in community_members
    await supabase
      .from("community_members")
      .update({ post_count: Math.max(0, (existingPost.post_count || 0) - 1) })
      .eq("community_id", existingPost.community_id)
      .eq("user_id", existingPost.author_id);

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// Get user's posts
export const getUserPosts = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const {
      data: posts,
      error,
      count,
    } = await supabase
      .from("posts")
      .select(
        `
        *,
        community:communities(id, name, slug, image_url)
      `,
      )
      .eq("author_id", user_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: posts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || posts?.length || 0,
        totalPages: Math.ceil((count || posts?.length || 0) / limit),
      },
    });
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// Toggle post pin
export const togglePinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if post exists
    const { data: existingPost, error: postError } = await supabase
      .from("posts")
      .select("community_id, is_pinned")
      .eq("id", id)
      .single();

    if (postError || !existingPost) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if user is community admin/moderator
    const { data: memberRole } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", existingPost.community_id)
      .eq("user_id", user_id)
      .in("role", ["admin", "moderator"])
      .single();

    if (!memberRole) {
      return res.status(403).json({
        success: false,
        error: "Only admins and moderators can pin/unpin posts",
      });
    }

    const { data: post, error } = await supabase
      .from("posts")
      .update({
        is_pinned: !existingPost.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: post,
      message: `Post ${post.is_pinned ? "pinned" : "unpinned"} successfully`,
    });
  } catch (err) {
    console.error("Toggle pin error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};
