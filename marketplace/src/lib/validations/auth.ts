import { z } from "zod";

// Public-facing role choices at signup. ADMIN accounts are never
// self-registered — they are provisioned directly (seed script / another
// admin), never trusted from a client-submitted role field.
export const SIGNUP_ROLES = ["CREATOR", "BRAND"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name is too long"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long")
      .regex(/[a-z]/, "Password needs at least one lowercase letter")
      .regex(/[A-Z]/, "Password needs at least one uppercase letter")
      .regex(/[0-9]/, "Password needs at least one number"),
    role: z.enum(SIGNUP_ROLES, {
      message: "Select whether you're a creator or a brand",
    }),
    companyName: z.string().trim().max(150).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "BRAND" && (!data.companyName || data.companyName.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["companyName"],
        message: "Company name is required for brand accounts",
      });
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
