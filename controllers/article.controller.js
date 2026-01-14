import { supabase } from "../utils/supabase_client.js";
import { validationResult } from "express-validator";

// Category configuration (ENUM values)
const CATEGORIES = [
  { value: "cooperative-news", label: "Cooperative News" },
  { value: "member-stories", label: "Member Stories" },
  { value: "financial-updates", label: "Financial Updates" },
  { value: "community-events", label: "Community Events" },
  { value: "agricultural-tips", label: "Agricultural Tips" },
  { value: "training-programs", label: "Training Programs" },
  { value: "success-stories", label: "Success Stories" },
  { value: "announcements", label: "Announcements" },
];

// Status configuration
const STATUSES = ["draft", "published", "archived"];

// Helper function to calculate read time
const calculateReadTime = (content) => {
  if (!content) return 5;
  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200)); // At least 1 minute
};

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
};

// Helper to get category label
const getCategoryLabel = (categoryValue) => {
  const category = CATEGORIES.find((c) => c.value === categoryValue);
  return category ? category.label : "Uncategorized";
};

// @desc    Get all articles
// @route   GET /api/articles
// @access  Public
export const getArticles = async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 10,
      search,
      sort = "created_at",
      order = "desc",
    } = req.query;

    let query = supabase.from("articles").select("*", { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    // Apply sorting
    if (sort && order) {
      query = query.order(sort, { ascending: order === "asc" });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: articles, error, count } = await query;

    if (error) {
      throw error;
    }

    // Add category labels to articles
    const articlesWithLabels = articles.map((article) => ({
      ...article,
      category_label: getCategoryLabel(article.category),
    }));

    res.status(200).json({
      success: true,
      count: articles.length,
      total: count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        hasNextPage: page * limit < count,
        hasPrevPage: page > 1,
      },
      data: articlesWithLabels,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get categories
// @route   GET /api/articles/categories
// @access  Public
export const getCategories = (req, res) => {
  res.status(200).json({
    success: true,
    data: CATEGORIES,
  });
};

// @desc    Get single article
// @route   GET /api/articles/:identifier
// @access  Public
export const getArticle = async (req, res) => {
  try {
    const { identifier } = req.params;

    let query = supabase.from("articles").select("*");

    // Check if identifier is UUID format
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier
      );

    if (isUUID) {
      query = query.eq("id", identifier);
    } else {
      query = query.eq("slug", identifier);
    }

    const { data: article, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Article not found",
        });
      }
      throw error;
    }

    // Increment view count
    await supabase
      .from("articles")
      .update({ views: (article.views || 0) + 1 })
      .eq("id", article.id);

    // Add category label
    const articleWithLabel = {
      ...article,
      category_label: getCategoryLabel(article.category),
    };

    // Get related articles (same category)
    const { data: relatedArticles } = await supabase
      .from("articles")
      .select(
        "id, title, slug, excerpt, featured_image_url, read_time, category"
      )
      .eq("category", article.category)
      .neq("id", article.id)
      .eq("status", "published")
      .limit(3)
      .order("created_at", { ascending: false });

    // Add category labels to related articles
    const relatedWithLabels =
      relatedArticles?.map((article) => ({
        ...article,
        category_label: getCategoryLabel(article.category),
      })) || [];

    res.status(200).json({
      success: true,
      data: {
        ...articleWithLabel,
        related_articles: relatedWithLabels,
      },
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create article
// @route   POST /api/articles
// @access  Private/Admin
export const createArticle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      featured_image_url,
      category,
      status = "draft",
      tags = [],
    } = req.body;

    // Validate category
    if (category && !CATEGORIES.some((c) => c.value === category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // Generate slug if not provided
    const slug = customSlug || generateSlug(title);

    // Check if slug already exists
    const { data: existingArticle } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingArticle) {
      return res.status(400).json({
        success: false,
        message: "Article with this slug already exists",
      });
    }

    // Calculate read time
    const read_time = calculateReadTime(content);

    // Prepare tags array
    const formattedTags = Array.isArray(tags)
      ? tags.filter((tag) => tag && tag.trim() !== "")
      : typeof tags === "string"
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== "")
      : [];

    // Create article (no author_id needed since admin only)
    const { data: article, error } = await supabase
      .from("articles")
      .insert([
        {
          title,
          slug,
          excerpt,
          content,
          featured_image_url,
          category: category || null,
          status,
          read_time,
          tags: formattedTags,
          published_at:
            status === "published" ? new Date().toISOString() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Add category label
    const articleWithLabel = {
      ...article,
      category_label: getCategoryLabel(article.category),
    };

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: articleWithLabel,
    });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private/Admin
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      featured_image_url,
      category,
      status,
      tags,
    } = req.body;

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Validate category if provided
    if (category && !CATEGORIES.some((c) => c.value === category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // Generate slug if not provided
    const slug = customSlug || generateSlug(title || existingArticle.title);

    // Check if slug already exists for another article
    if (slug !== existingArticle.slug) {
      const { data: slugArticle } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .single();

      if (slugArticle) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists for another article",
        });
      }
    }

    // Calculate read time
    const read_time = content
      ? calculateReadTime(content)
      : existingArticle.read_time;

    // Prepare update data
    const updateData = {
      ...(title && { title }),
      slug,
      ...(excerpt !== undefined && { excerpt }),
      ...(content && { content }),
      ...(featured_image_url !== undefined && { featured_image_url }),
      ...(category !== undefined && { category: category || null }),
      ...(status && { status }),
      read_time,
      updated_at: new Date().toISOString(),
    };

    // Handle tags if provided
    if (tags !== undefined) {
      const formattedTags = Array.isArray(tags)
        ? tags.filter((tag) => tag && tag.trim() !== "")
        : typeof tags === "string"
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "")
        : existingArticle.tags;

      updateData.tags = formattedTags;
    }

    // Set published_at if status changed to published
    if (status === "published" && existingArticle.status !== "published") {
      updateData.published_at = new Date().toISOString();
    }

    // Set archived_at if status changed to archived
    if (status === "archived" && existingArticle.status !== "archived") {
      updateData.archived_at = new Date().toISOString();
    }

    // Update article
    const { data: article, error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add category label
    const articleWithLabel = {
      ...article,
      category_label: getCategoryLabel(article.category),
    };

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: articleWithLabel,
    });
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private/Admin
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from("articles")
      .select("id, featured_image_url")
      .eq("id", id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Delete article (cascade will delete comments and likes)
    const { error: deleteError } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Update article status
// @route   PATCH /api/articles/:id/status
// @access  Private/Admin
export const updateArticleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Check if article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from("articles")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingArticle) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set published_at if status changed to published
    if (status === "published" && existingArticle.status !== "published") {
      updateData.published_at = new Date().toISOString();
    }

    // Set archived_at if status changed to archived
    if (status === "archived" && existingArticle.status !== "archived") {
      updateData.archived_at = new Date().toISOString();
    }

    // Update article status
    const { data: article, error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add category label
    const articleWithLabel = {
      ...article,
      category_label: getCategoryLabel(article.category),
    };

    res.status(200).json({
      success: true,
      message: `Article status updated to ${status}`,
      data: articleWithLabel,
    });
  } catch (error) {
    console.error("Error updating article status:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
