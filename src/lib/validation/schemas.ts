import { z } from "zod"

export const emailSchema = z.string().email("Invalid email address")

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores and dashes",
  )

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

export const registrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signUpSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(), // We'll refine it below
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // Show error on confirmPassword field
  })
signUpSchema

export type RegistrationData = z.infer<typeof registrationSchema>

// UploadMediaModal form schema
export const UploadMediaSchema = z.object({
  media: z
    .union([
      // Single image
      z.object({
        type: z.literal("image"),
        file: z.instanceof(File),
      }),

      // Single video
      z.object({
        type: z.literal("video"),
        file: z.instanceof(File),
      }),

      // Album of images
      z.object({
        type: z.literal("album"),
        files: z
          .array(z.instanceof(File))
          .min(1, "Album must have at least 1 image"),
      }),
    ])
    .nullable()
    .default(null),
  caption: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : ""),
    z.string().max(2200, "Caption must be at most 2200 characters"),
  ),
  visibility: z.enum(["public", "private", "friends"]).default("public"),
  location: z
    .object({
      display_name: z.string().max(200),
      lat: z.string(),
      lon: z.string(),
      address: z
        .object({
          country: z.string().optional(),
          state: z.string().optional(),
          city: z.string().optional(),
          postcode: z.string().optional(),
        })
        .optional(),
    })
    .nullable()
    .default(null),
})
