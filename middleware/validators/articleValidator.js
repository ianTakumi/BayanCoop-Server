import { body, param, query } from "express-validator";

export const createArticleValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be between 5 and 255 characters"),

  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage(
      "Slug must be URL-friendly (lowercase letters, numbers, hyphens)"
    ),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status value"),

  body("category_id")
    .optional()
    .isInt()
    .withMessage("Category ID must be an integer"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

export const updateArticleValidator = [
  param("id").isInt().withMessage("Invalid article ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be between 5 and 255 characters"),

  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug must be URL-friendly"),
];

export const updateStatusValidator = [
  param("id").isInt().withMessage("Invalid article ID"),

  body("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid status value"),
];
