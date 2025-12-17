import { SignupForm } from "@/components/forms/signup-form"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const SignupPage = () => {
    return (
        <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 -right-4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px] pointer-events-none" />

            {/* Back Button */}
            <Button
                asChild
                variant="ghost"
                className="absolute top-6 left-6 z-20"
            >
                <Link href="/" className="flex items-center gap-2">
                    <IconArrowLeft size={20} />
                    <span className="text-sm font-medium">Back</span>
                </Link>
            </Button>

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl"> */}
                {/* Branding */}
                {/* <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground mb-1">
                        Nomad<span className="text-primary">Darts</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">Join the community</p>
                </div> */}

                <SignupForm />
                {/* </div> */}
            </div>
        </div>
    )
}

export default SignupPage