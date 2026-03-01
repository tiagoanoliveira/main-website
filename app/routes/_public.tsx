// app/routes/_public.tsx
import { Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/_public";
import Navbar from "~/components/layout/Navbar";
import Footer from "~/components/layout/Footer";
import { getSessionUser } from "~/lib/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    return { isLoggedIn: !!user };
}

export default function PublicLayout() {
    const { isLoggedIn } = useLoaderData<typeof loader>();
    return (
        <>
            <Navbar isLoggedIn={isLoggedIn} />
            <main className="pt-16">
                <Outlet />
            </main>
            <Footer />
        </>
    );
}