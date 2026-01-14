import { supabase } from "../utils/supabase_client.js";

// Helper function to get product count for a category
async function getProductCount(categoryId) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id", { count: "exact" })
      .eq("category_id", categoryId)
      .is("archived_at", null);

    if (error) {
      console.error("Error getting product count:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in getProductCount:", error);
    return 0;
  }
}

// Helper function to check if category can be archived
async function canArchiveCategory(categoryId) {
  try {
    // Check for active products in this category
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", categoryId)
      .is("archived_at", null);

    if (productsError) throw productsError;

    // Check for subcategories that are active
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from("categories")
      .select("id")
      .eq("parent_category_id", categoryId)
      .is("archived_at", null);

    if (subcategoriesError) throw subcategoriesError;

    const productCount = products?.length || 0;
    const subcategoryCount = subcategories?.length || 0;

    return {
      canArchive: productCount === 0 && subcategoryCount === 0,
      productCount,
      subcategoryCount,
    };
  } catch (error) {
    console.error("Error in canArchiveCategory:", error);
    return {
      canArchive: false,
      productCount: 0,
      subcategoryCount: 0,
      error: error.message,
    };
  }
}

// Get all categories for admin (hierarchical view)
export const getAllCategoriesForAdmin = async (req, res) => {
  try {
    const { include_archived = "false" } = req.query;
    const showArchived = include_archived === "true";

    // Build base query
    let query = supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by archive status if not including archived
    if (!showArchived) {
      query = query.is("archived_at", null);
    }

    const { data: categories, error } = await query;

    if (error) throw error;

    // Get parent category names separately
    const parentCategoryIds = categories
      .map((cat) => cat.parent_category_id)
      .filter((id) => id !== null);

    let parentCategories = [];
    if (parentCategoryIds.length > 0) {
      const { data: parents, error: parentError } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", parentCategoryIds);

      if (!parentError) {
        parentCategories = parents || [];
      }
    }

    // Create a map for easy parent category lookup
    const parentCategoryMap = parentCategories.reduce((map, parent) => {
      map[parent.id] = parent;
      return map;
    }, {});

    // Build hierarchical structure
    const buildTreeAsync = async (parentId = null) => {
      const rootCategories = categories.filter(
        (cat) => cat.parent_category_id === parentId
      );
      const tree = [];

      for (const cat of rootCategories) {
        const parentCategory = parentCategoryMap[cat.parent_category_id];

        tree.push({
          id: cat.id,
          name: cat.name,
          description: cat.desc,
          parent_id: cat.parent_category_id,
          parent_category_name: parentCategory?.name || null,
          is_archived: cat.archived_at !== null,
          archived_at: cat.archived_at,
          archive_reason: cat.archive_reason,
          created_at: cat.created_at,
          updated_at: cat.updated_at,
          product_count: await getProductCount(cat.id),
          children: await buildTreeAsync(cat.id),
        });
      }

      return tree;
    };

    const categoryTree = await buildTreeAsync();

    const activeCategories = categories.filter(
      (cat) => cat.archived_at === null
    );
    const archivedCategories = categories.filter(
      (cat) => cat.archived_at !== null
    );

    console.log(
      `✅ Retrieved ${categories.length} categories (${activeCategories.length} active, ${archivedCategories.length} archived)`
    );

    return res.status(200).json({
      success: true,
      data: categoryTree,
      meta: {
        total_categories: categories.length,
        total_active: activeCategories.length,
        total_archived: archivedCategories.length,
        include_archived: showArchived,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.log("❌ Cannot get all categories for admin", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get categories for dropdowns (flat list)
export const getCategoriesForDropdown = async (req, res) => {
  try {
    const { include_archived = "false" } = req.query;
    const showArchived = include_archived === "true";

    let query = supabase
      .from("categories")
      .select("id, name, parent_category_id, archived_at")
      .order("name", { ascending: true });

    if (!showArchived) {
      query = query.is("archived_at", null);
    }

    const { data: categories, error } = await query;

    if (error) throw error;

    // Get parent category names
    const parentCategoryIds = categories
      .map((cat) => cat.parent_category_id)
      .filter((id) => id !== null);

    let parentCategories = [];
    if (parentCategoryIds.length > 0) {
      const { data: parents, error: parentError } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", parentCategoryIds);

      if (!parentError) {
        parentCategories = parents || [];
      }
    }

    const parentCategoryMap = parentCategories.reduce((map, parent) => {
      map[parent.id] = parent;
      return map;
    }, {});

    const categoriesWithParentNames = categories.map((category) => ({
      id: category.id,
      name: category.name,
      parent_id: category.parent_category_id,
      parent_name: parentCategoryMap[category.parent_category_id]?.name || null,
      is_archived: category.archived_at !== null,
    }));

    return res.status(200).json({
      success: true,
      data: categoriesWithParentNames,
      meta: {
        total_categories: categories.length,
        include_archived: showArchived,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.log("❌ Cannot get categories for dropdown", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, parent_category_id } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Name and Description is required",
      });
    }

    const categoryData = {
      name: name,
      desc: description,
      parent_category_id: parent_category_id,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    const { data: newCategory, error: createError } = await supabase
      .from("categories")
      .insert([categoryData])
      .select()
      .single();

    if (createError) {
      console.log("Supabase insert error:", createError);
      throw createError;
    }

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (err) {
    console.log("❌ Cannot create category", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { name, description, parent_category_id } = req.body;

    console.log("📝 Update request for category_id:", category_id);
    console.log("📝 Request body:", req.body);

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // FIRST: Check if the category exists at all (even archived)
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, archived_at")
      .eq("id", category_id)
      .maybeSingle();

    console.log("🔍 Category check result:", { existingCategory, fetchError });

    if (fetchError) {
      console.log("❌ Fetch error:", fetchError);
      return res.status(500).json({
        success: false,
        message: "Database error checking category",
        error: fetchError.message,
      });
    }

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if archived
    if (existingCategory.archived_at) {
      return res.status(400).json({
        success: false,
        message: "Cannot update an archived category",
      });
    }

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined && name.trim() !== "") {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      // IMPORTANT: Check if client is sending empty description
      if (description.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }
      updateData.desc = description.trim(); // Column name is 'desc'
    }

    // Handle parent_category_id
    if (parent_category_id !== undefined) {
      if (
        parent_category_id === null ||
        parent_category_id === "null" ||
        parent_category_id === "" ||
        parent_category_id === "0"
      ) {
        updateData.parent_category_id = null;
      } else {
        // Validate that parent category exists
        const { data: parentCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("id", parent_category_id)
          .is("archived_at", null)
          .single();

        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found or is archived",
          });
        }

        // Prevent circular reference (category cannot be its own parent)
        if (parent_category_id === category_id) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }

        updateData.parent_category_id = parent_category_id;
      }
    }

    console.log("📝 Final update data to send:", updateData);

    // PERFORM THE UPDATE WITHOUT .single() FIRST
    const { error: updateError } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", category_id);

    if (updateError) {
      console.log("❌ Update error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: updateError.message,
      });
    }

    // THEN FETCH THE UPDATED CATEGORY
    const { data: updatedCategory, error: fetchUpdatedError } = await supabase
      .from("categories")
      .select("*")
      .eq("id", category_id)
      .single();

    if (fetchUpdatedError) {
      console.log("❌ Fetch updated error:", fetchUpdatedError);

      // Even if fetch failed, the update might still be successful
      // Try one more time with maybeSingle
      const { data: retryData } = await supabase
        .from("categories")
        .select("*")
        .eq("id", category_id)
        .maybeSingle();

      if (retryData) {
        return res.json({
          success: true,
          message: "Category updated successfully",
          data: retryData,
        });
      }

      // If we still can't fetch, at least confirm the update worked
      return res.json({
        success: true,
        message: "Category updated successfully",
        warning: "Could not fetch updated data immediately",
      });
    }

    console.log("✅ Category updated successfully:", updatedCategory);

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (err) {
    console.log("❌ Cannot update category:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Archive category
export const archiveCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { archive_reason } = req.body;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Check if category exists and is not already archived
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("archived_at, name")
      .eq("id", category_id)
      .single();

    if (fetchError || !category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.archived_at) {
      return res.status(400).json({
        success: false,
        message: "Category is already archived",
      });
    }

    // Check if category can be archived
    const archiveCheck = await canArchiveCategory(category_id);
    if (!archiveCheck.canArchive) {
      return res.status(400).json({
        success: false,
        message: `Cannot archive category. It has ${archiveCheck.productCount} active products and ${archiveCheck.subcategoryCount} active subcategories.`,
        details: archiveCheck,
      });
    }

    // Archive the category
    const { data: archivedCategory, error: archiveError } = await supabase
      .from("categories")
      .update({
        archived_at: new Date().toISOString(),
        archive_reason: archive_reason || "Archived by user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", category_id)
      .select("id, name, archived_at, archive_reason")
      .single();

    if (archiveError) throw archiveError;

    return res.json({
      success: true,
      message: "Category archived successfully",
      data: archivedCategory,
    });
  } catch (err) {
    console.log("❌ Cannot archive category", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Restore category
export const restoreCategory = async (req, res) => {
  try {
    const { category_id } = req.params;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Check if category exists and is archived
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("archived_at, parent_category_id, name")
      .eq("id", category_id)
      .single();

    if (fetchError || !category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!category.archived_at) {
      return res.status(400).json({
        success: false,
        message: "Category is already active",
      });
    }

    // Check if parent category is active (if this is a subcategory)
    if (category.parent_category_id) {
      const { data: parentCategory, error: parentError } = await supabase
        .from("categories")
        .select("archived_at")
        .eq("id", category.parent_category_id)
        .single();

      if (parentError || !parentCategory || parentCategory.archived_at) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot restore category because parent category is archived",
        });
      }
    }

    // Restore the category
    const { data: restoredCategory, error: restoreError } = await supabase
      .from("categories")
      .update({
        archived_at: null,
        archive_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category_id)
      .select("id, name, updated_at")
      .single();

    if (restoreError) throw restoreError;

    return res.json({
      success: true,
      message: "Category restored successfully",
      data: restoredCategory,
    });
  } catch (err) {
    console.log("❌ Cannot restore category", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { category_id } = req.params;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const { data: category, error } = await supabase
      .from("categories")
      .select(
        `
        *,
        parent_category:parent_category_id (id, name)
      `
      )
      .eq("id", category_id)
      .single();

    if (error || !category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get product count
    const product_count = await getProductCount(category_id);

    return res.status(200).json({
      success: true,
      data: {
        ...category,
        product_count,
        is_archived: category.archived_at !== null,
      },
    });
  } catch (err) {
    console.log("❌ Cannot get category", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
