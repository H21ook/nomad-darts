"use client";

import StoreProvider from "./store-provider";

const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <StoreProvider>
            {children}
        </StoreProvider>
    )
}

export default Providers