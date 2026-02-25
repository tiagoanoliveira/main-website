import { redirect, Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/admin.layout";
import { getSessionUser } from "~/lib/auth.server";
import AdminLayout from "~/components/layout/AdminLayout";

export async function loader({ request, context }: Route.LoaderArgs) {
    const db = context.cloudflare.env.DB;
    const user = await getSessionUser(db, request);
    if (!user || user.role !== "admin") throw redirect("/admin");
    return { user };
}

export default function AdminLayoutRoute() {
    const { user } = useLoaderData<typeof loader>();
    return (
        <AdminLayout user={user}>
            <Outlet />
        </AdminLayout>
    );
}
