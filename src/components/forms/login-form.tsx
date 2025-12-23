"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
            <div className="text-center space-y-1 pb-2">
                <h2 className="text-3xl font-black tracking-tight uppercase italic">Welcome Back</h2>
                <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.3em]">
                    Sign in to your account
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FieldGroup className="space-y-2">
                    {/* Email Field */}
                    <Field>
                        <FieldLabel htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                            Email Address
                        </FieldLabel>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors">
                                <IconMail size={18} />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                className="pl-12 h-12 bg-white/[0.02] border-white/5 focus-visible:border-primary/50 focus-visible:ring-primary/10 rounded-xl transition-all"
                                required
                                {...register("email")}
                                aria-invalid={errors.email ? true : false}
                            />
                        </div>
                        {errors.email && (
                            <FieldDescription id="email-error" className="text-destructive text-[10px] font-bold ml-1">
                                {errors.email.message}
                            </FieldDescription>
                        )}
                    </Field>

                    {/* Password Field */}
                    <Field>
                        <div className="flex items-center justify-between ml-1">
                            <FieldLabel htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                Password
                            </FieldLabel>
                            <Link
                                href="#"
                                className="text-[9px] text-primary/40 hover:text-primary transition-colors font-bold uppercase tracking-widest"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors z-10">
                                <IconLock size={18} />
                            </div>
                            <InputGroup className="h-12">
                                <InputGroupInput
                                    id="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    className="pl-12 h-12 bg-white/2 border-white/5 focus-visible:border-primary/50 focus-visible:ring-primary/10 rounded-xl transition-all"
                                    {...register("password")}
                                    aria-invalid={errors.password ? true : false}
                                />
                                <InputGroupAddon align="inline-end" className="pr-2">
                                    <InputGroupButton
                                        aria-label="Toggle Password Visibility"
                                        title="Toggle Password Visibility"
                                        size="icon-xs"
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg"
                                    >
                                        {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        {errors.password && (
                            <FieldDescription id="password-error" className="text-destructive text-[10px] font-bold ml-1">
                                {errors.password.message}
                            </FieldDescription>
                        )}
                    </Field>

                    <div className="space-y-4 pt-2">
                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold text-center">
                                {errorMessage}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl font-black text-sm tracking-[0.2em] bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                            {isSubmitting ? "Signing in..." : "SIGN IN"}
                        </Button>

                        <div className="py-2 flex items-center justify-center gap-2">
                            <div className="h-px w-full bg-white/5"></div>
                            <div className="flex-1 flex justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 text-nowrap">
                                <span className="px-2">Or</span>
                            </div>
                            <div className="h-px w-full bg-white/5"></div>
                        </div>

                        <Button
                            variant="outline"
                            type="button"
                            className="w-full h-12 rounded-xl border-white/5 bg-white/1 hover:bg-white/3 hover:border-white/10 transition-all font-bold gap-3 text-xs"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                />
                            </svg>
                            Sign in with Google
                        </Button>
                    </div>
                </FieldGroup>
            </form>

            <div className="pt-2 text-center">
                <p className="text-[11px] text-muted-foreground/50 font-medium">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/auth/sign-up"
                        className="text-primary hover:cyan-glow-text transition-all font-bold underline underline-offset-4 decoration-primary/20"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
