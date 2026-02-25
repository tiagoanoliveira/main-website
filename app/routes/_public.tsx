import { Outlet } from "react-router";
import Navbar from "~/components/layout/Navbar";
import Footer from "~/components/layout/Footer";

export default function PublicLayout() {
    return (
        <>
            <Navbar />
            <main className="pt-16">
                <Outlet />
            </main>
            <Footer />
        </>
    );
}
