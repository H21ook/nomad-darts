"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema, type SignupSchema } from "@/lib/schema/auth-schema"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"


export function SignupForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<SignupSchema>({
        resolver: zodResolver(signupSchema),
    })

    const passwordValue = watch("password");
    const onSubmit = async (data: SignupSchema) => {
        try {
            setErrorMessage(null);
            const supabase = createClient();

            const { data: signUpData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password
            });

            if (data.password !== data.confirmPassword) {
                setError("confirmPassword", {
                    type: "manual",
                    message: "Passwords do not match",
                });
            }

            // error
            if (error) {
                setErrorMessage(error.message);
                return;
            }
            // success
            toast.success("Signup successful. Please check your email for the verification link.");
            reset();
        } catch (error) {
            console.error("Signup failed", error)
            setErrorMessage("Something went wrong. Please try again later.");
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Sign up to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to sign up to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    required
                                    {...register("email")}
                                    aria-invalid={errors.email ? true : false}
                                />
                                {errors.email && (
                                    <FieldDescription className="text-destructive">
                                        {errors.email.message}
                                    </FieldDescription>
                                )}
                            </Field>

                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                </div>
                                <InputGroup>
                                    <InputGroupInput id="password"
                                        placeholder="Enter your password"
                                        type={showPassword ? "text" : "password"}
                                        {...register("password")}
                                        aria-invalid={errors.password ? true : false}
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            aria-label="Show Password"
                                            title="Show Password"
                                            size="icon-xs"
                                            onClick={() => {
                                                setShowPassword(prev => !prev)
                                            }}
                                        >
                                            {showPassword ? <IconEyeOff /> : <IconEye />}
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>

                                {errors.password && (
                                    <FieldDescription className="text-destructive">
                                        {errors.password.message}
                                    </FieldDescription>
                                )}
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                                </div>
                                <InputGroup>
                                    <InputGroupInput
                                        id="confirm-password"
                                        placeholder="Confirm your password"
                                        type={showPassword ? "text" : "password"}
                                        {...register("confirmPassword", {
                                            validate: (value) => {
                                                if (value !== passwordValue) {
                                                    return "Passwords do not match";
                                                }
                                                return true;
                                            }
                                        })}
                                        aria-invalid={errors.confirmPassword ? true : false}
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            aria-label="Show Password"
                                            title="Show Password"
                                            size="icon-xs"
                                            onClick={() => {
                                                setShowPassword(prev => !prev)
                                            }}
                                        >
                                            {showPassword ? <IconEyeOff /> : <IconEye />}
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>

                                {errors.confirmPassword && (
                                    <FieldDescription className="text-destructive">
                                        {errors.confirmPassword.message}
                                    </FieldDescription>
                                )}
                            </Field>

                            <Field>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Signing up..." : "Sign up"}
                                </Button>

                                {
                                    errorMessage && (
                                        <FieldDescription className="text-destructive">
                                            {errorMessage}
                                        </FieldDescription>
                                    )
                                }
                                <Button variant="outline" type="button">
                                    Sign up with Google
                                </Button>
                                <FieldDescription className="text-center">
                                    Already have an account? <Link href="/auth/login">Login</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
