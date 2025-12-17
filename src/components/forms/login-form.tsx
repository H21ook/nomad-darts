"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldLabel,
} from "@/components/ui/field"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginSchema } from "@/lib/schema/auth-schema"
import { store } from "@/lib/redux/store"
import { setAccessToken } from "@/lib/redux/authSlice"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group"
import { IconEye, IconEyeOff, IconLock, IconMail } from "@tabler/icons-react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"


export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();
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
            router.push("/dashboard");
        } catch (error) {
            console.error("Login failed", error)
            setErrorMessage("Something went wrong. Please try again later.");
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your accounts stats
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                        {/* Email Field */}
                        <Field>
                            <FieldLabel htmlFor="email">
                                Email Address
                            </FieldLabel>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <IconMail size={18} />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="pl-10"
                                    required
                                    {...register("email")}
                                    aria-invalid={errors.email ? true : false}
                                />
                            </div>
                            {errors.email && (
                                <FieldDescription className="text-destructive text-xs">
                                    {errors.email.message}
                                </FieldDescription>
                            )}
                        </Field>

                        {/* Password Field */}
                        <Field>
                            <div className="flex items-center justify-between">
                                <FieldLabel htmlFor="password">
                                    Password
                                </FieldLabel>
                                <Link
                                    href="#"
                                    className="text-xs text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                                    <IconLock size={18} />
                                </div>
                                <InputGroup>
                                    <InputGroupInput
                                        id="password"
                                        placeholder="Enter your password"
                                        type={showPassword ? "text" : "password"}
                                        className="pl-10"
                                        {...register("password")}
                                        aria-invalid={errors.password ? true : false}
                                    />
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            aria-label="Toggle Password Visibility"
                                            title="Toggle Password Visibility"
                                            size="icon-xs"
                                            onClick={() => setShowPassword(prev => !prev)}
                                        >
                                            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>
                            </div>

                            {errors.password && (
                                <FieldDescription className="text-destructive text-xs">
                                    {errors.password.message}
                                </FieldDescription>
                            )}
                        </Field>


                        <Field>
                            {
                                errorMessage && (
                                    <FieldDescription className="text-destructive">
                                        {errorMessage}
                                    </FieldDescription>
                                )
                            }

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>


                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            <Button variant="outline" type="button">
                                Sign up with Google
                            </Button>

                            <FieldDescription className="text-center">
                                Don&apos;t have an account? <Link
                                    href="/auth/sign-up"
                                    className="text-primary hover:underline font-medium"
                                >
                                    Sign up for free
                                </Link>
                            </FieldDescription>
                        </Field>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
