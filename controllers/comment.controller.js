import { supabase } from "../utils/supabase_client.js";

// Get comments for a post
export const getCommentsByPostId = async (req, res) => {
  try {
    const { post_id } = req.params;
    const user_id = req.user?.id;
    console.log(
      "Fetching comments for post_id:",
      post_id,
      "by user_id:",
      user_id,
    );

    // Step 1: Get all top-level comments
    const { data: comments, error } = await supabase
      .from("post_comments")
      .select(
        `
        *,
        author:author_id (
          id,
          first_name,
          last_name,
          image,
          role
        )
      `,
      )
      .eq("post_id", post_id)
      .eq("is_removed", false)
      .is("parent_id", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log("Found comments:", comments?.length || 0);

    // Step 2: Get user votes if user is logged in
    let userVotes = {};
    if (user_id && comments && comments.length > 0) {
      const { data: votes } = await supabase
        .from("comment_votes")
        .select("comment_id, vote_type")
        .eq("user_id", user_id)
        .in(
          "comment_id",
          comments.map((c) => c.id),
        );

      if (votes) {
        votes.forEach((vote) => {
          userVotes[vote.comment_id] = vote.vote_type;
        });
      }
    }

    // Step 3: Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        // Get replies for this comment
        const { data: replies } = await supabase
          .from("post_comments")
          .select(
            `
            *,
            author:author_id (
              id,
              first_name,
              last_name,
              image,
              role
            )
          `,
          )
          .eq("post_id", post_id)
          .eq("parent_id", comment.id)
          .eq("is_removed", false)
          .order("created_at", { ascending: true });

        // Get user votes for replies
        let replyUserVotes = {};
        if (user_id && replies && replies.length > 0) {
          const { data: replyVotes } = await supabase
            .from("comment_votes")
            .select("comment_id, vote_type")
            .eq("user_id", user_id)
            .in(
              "comment_id",
              replies.map((r) => r.id),
            );

          if (replyVotes) {
            replyVotes.forEach((vote) => {
              replyUserVotes[vote.comment_id] = vote.vote_type;
            });
          }
        }

        return {
          ...comment,
          user_vote: userVotes[comment.id] || null,
          replies: replies
            ? replies.map((reply) => ({
                ...reply,
                user_vote: replyUserVotes[reply.id] || null,
              }))
            : [],
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: commentsWithReplies,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
};

// Create a comment
export const createComment = async (req, res) => {
  try {
    const { post_id } = req.params;
    const { content, parent_id = null } = req.body;
    const user_id = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // If parent_id is provided, check if parent comment exists
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from("post_comments")
        .select("id, post_id")
        .eq("id", parent_id)
        .eq("post_id", post_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from("post_comments")
      .insert({
        post_id,
        author_id: user_id,
        parent_id,
        content: content.trim(),
        reply_count: 0,
        upvote_count: 0,
        downvote_count: 0,
      })
      .select(
        `
        *,
        author:author_id (
          id,
          first_name,
          last_name,
          image,
          role
        )
      `,
      )
      .single();

    if (commentError) throw commentError;

    // If this is a reply, update parent comment's reply_count
    if (parent_id) {
      await supabase.rpc("increment_comment_reply_count", {
        comment_id: parent_id,
      });
    }

    // Update post comment count
    await supabase.rpc("increment_post_comment_count", {
      post_id: post_id,
    });

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
    });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // Check if comment exists and user owns it
    const { data: comment, error: commentError } = await supabase
      .from("post_comments")
      .select("*")
      .eq("id", comment_id)
      .eq("author_id", user_id)
      .eq("is_removed", false)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or unauthorized",
      });
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("post_comments")
      .update({
        content: content.trim(),
        updated_at: new Date(),
      })
      .eq("id", comment_id)
      .select(
        `
        *,
        author:author_id (
          id,
          first_name,
          last_name,
          image,
          role
        )
      `,
      )
      .single();

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update comment",
    });
  }
};

// Delete a comment (soft delete)
export const deleteComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const user_id = req.user.id;

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from("post_comments")
      .select("id, author_id, post_id, parent_id")
      .eq("id", comment_id)
      .eq("is_removed", false)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is authorized (owner or admin/moderator)
    const isOwner = comment.author_id === user_id;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this comment",
      });
    }

    // Soft delete the comment
    const { error: deleteError } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", comment_id);

    if (deleteError) throw deleteError;

    // If this is a top-level comment, update post comment count
    if (!comment.parent_id) {
      await supabase.rpc("decrement_post_comment_count", {
        post_id: comment.post_id,
      });
    } else {
      // If this is a reply, update parent comment's reply_count
      await supabase.rpc("decrement_comment_reply_count", {
        comment_id: comment.parent_id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

// Toggle vote on comment
export const toggleCommentVote = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { type } = req.body; // 'upvote' or 'downvote'
    const user_id = req.user.id;

    if (!type || !["upvote", "downvote"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote type",
      });
    }

    // Check if user has already voted
    const { data: existingVote, error: voteError } = await supabase
      .from("comment_votes")
      .select("id, vote_type")
      .eq("comment_id", comment_id)
      .eq("user_id", user_id)
      .single();

    let result;
    let voteOperation;

    if (existingVote) {
      if (existingVote.vote_type === type) {
        // Remove vote if same type
        const { error: deleteError } = await supabase
          .from("comment_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) throw deleteError;
        voteOperation = "removed";
      } else {
        // Update vote if different type
        const { error: updateError } = await supabase
          .from("comment_votes")
          .update({ vote_type: type, updated_at: new Date() })
          .eq("id", existingVote.id);

        if (updateError) throw updateError;
        voteOperation = "updated";
      }
    } else {
      // Create new vote
      const { error: insertError } = await supabase
        .from("comment_votes")
        .insert({
          comment_id,
          user_id,
          vote_type: type,
        });

      if (insertError) throw insertError;
      voteOperation = "added";
    }

    // Get updated counts
    const { data: updatedComment, error: commentError } = await supabase
      .from("post_comments")
      .select("upvote_count, downvote_count")
      .eq("id", comment_id)
      .single();

    if (commentError) throw commentError;

    // Get current user's vote status
    const { data: userVote } = await supabase
      .from("comment_votes")
      .select("vote_type")
      .eq("comment_id", comment_id)
      .eq("user_id", user_id)
      .maybeSingle();

    res.status(200).json({
      success: true,
      message: `Vote ${voteOperation} successfully`,
      data: {
        upvote_count: updatedComment.upvote_count,
        downvote_count: updatedComment.downvote_count,
        user_vote: userVote?.vote_type || null,
      },
    });
  } catch (error) {
    console.error("Error toggling comment vote:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vote",
    });
  }
};

// Helper function to check user role in community
const checkUserRole = async (user_id, post_id) => {
  try {
    // Get community_id from post
    const { data: post, error } = await supabase
      .from("posts")
      .select("community_id")
      .eq("id", post_id)
      .single();

    if (error) return false;

    // Check user's role in community
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", post.community_id)
      .eq("user_id", user_id)
      .single();

    return membership && ["admin", "moderator"].includes(membership.role);
  } catch (error) {
    return false;
  }
};
