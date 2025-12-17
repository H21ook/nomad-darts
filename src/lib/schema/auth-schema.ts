import { z } from "zod"

export const loginSchema = z.object({
    email: z
        .email("Invalid email address"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),
})

export const signupSchema = z.object({
    email: z
        .email("Invalid email address"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
        .string()
        .min(6, "Confirm password must be at least 6 characters"),
})
export type LoginSchema = z.infer<typeof loginSchema>
export type SignupSchema = z.infer<typeof signupSchema>