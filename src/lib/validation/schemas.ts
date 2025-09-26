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

export type RegistrationData = z.infer<typeof registrationSchema>

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

// UploadMediaModal form schema
export const uploadMediaSchema = z.object({
  media: z.array(z.instanceof(File)).min(1, "Post must have at least 1 image"),
  caption: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? val : ""),
    z.string().max(2200, "Caption must be at most 2200 characters"),
  ),
  visibility: z.enum(["public", "private", "friends"]).default("public"),
  // location: z
  //   .object({
  //     displayName: z.string(),
  //     lat: z.string(),
  //     lon: z.string(),
  //   })
  //   .optional(),
  location: z.string().optional(),
})

// export const uploadMediaSchema = z.object({
//   media: z.instanceof(File, { message: "Please upload a file." }).array(),
//   caption: z.string(),
//   visibility: z.enum(["public", "private", "friends"]).default("public"),
//   location: z.string(),
// })

export type UploadMediaSchema = typeof uploadMediaSchema
