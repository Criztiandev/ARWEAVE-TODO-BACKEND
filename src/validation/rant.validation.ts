import { z } from "zod";

export const rantValidationSchema = z.object({
  rant: z
    .string()
    .min(25, "Rant is too short")
    .max(500, "Rant cannot exceed 500 characters"),
  category: z
    .string()
    .min(2, "Category is too short")
    .max(64, "Category cannot exceed 500 characters"),
  toc: z.boolean().refine((value) => value === true, {
    message: "You must agree to the terms and conditions",
  }),
});

export const CommentValidation = z.object({
  comment: z
    .string()
    .min(8, "Rant is too short")
    .max(500, "Rant cannot exceed 500 characters"),
});
