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
import { loginSchema, type LoginSchema } from "@/lib/schema/auth-schema"
import { store } from "@/lib/redux/store"
import { setAccessToken } from "@/lib/redux/authSlice"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"


export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginSchema) => {
        try {
            setErrorMessage(null);

            const supabase = createClient();

            const { data: loggedData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                setErrorMessage("Invalid email or password");
                return;
            }

            store.dispatch(setAccessToken(loggedData.session.access_token));
            window.location.href = "/";
        } catch (error) {
            console.error("Login failed", error)
            setErrorMessage("Something went wrong. Please try again later.");
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
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
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <InputGroup>
                                    <InputGroupInput
                                        id="password"
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
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Logging in..." : "Login"}
                                </Button>

                                {
                                    errorMessage && (
                                        <FieldDescription className="text-destructive">
                                            {errorMessage}
                                        </FieldDescription>
                                    )
                                }
                                <Button variant="outline" type="button">
                                    Login with Google
                                </Button>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account? <Link href="/auth/register">Sign up</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
