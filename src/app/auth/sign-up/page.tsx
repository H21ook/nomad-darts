"use client";

import { AppBar } from "@/components/ui/app-bar"
import { SignupForm } from "@/components/forms/signup-form"
import { motion } from "framer-motion"

const SignupPage = () => {
    return (
        <div className="h-dvh bg-background flex flex-col relative overflow-hidden">
            <AppBar
                title=""
                backHref="/"
                className="bg-transparent border-none"
            />

            <div className="flex-1 flex flex-col items-center p-6 md:p-10 relative">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full animate-radar opacity-10" />
                </div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none" />

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <SignupForm />
                </motion.div>

            </div>
        </div>
    )
}

export default SignupPage