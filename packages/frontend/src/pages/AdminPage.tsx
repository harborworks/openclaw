import { lazy, Suspense } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

// Lazy load admin subpages
const UsersAdmin = lazy(() => import("./admin/UsersAdmin"));
const OrgsAdmin = lazy(() => import("./admin/OrgsAdmin"));
const MembershipsAdmin = lazy(() => import("./admin/MembershipsAdmin"));

// Loading component
const AdminLoader = () => (
  <div className="flex justify-center items-center p-8 h-[30vh]">
    <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

export default function AdminPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  const getActiveTab = () => {
    if (currentPath.includes("/admin/orgs")) return "orgs";
    if (currentPath.includes("/admin/memberships")) return "memberships";
    return "users";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs value={getActiveTab()} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" asChild>
            <Link to="/admin/users">Users</Link>
          </TabsTrigger>
          <TabsTrigger value="orgs" asChild>
            <Link to="/admin/orgs">Organizations</Link>
          </TabsTrigger>
          <TabsTrigger value="memberships" asChild>
            <Link to="/admin/memberships">Memberships</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <Suspense fallback={<AdminLoader />}>
          <Routes>
            <Route path="/" element={<UsersAdmin />} />
            <Route path="/users" element={<UsersAdmin />} />
            <Route path="/orgs" element={<OrgsAdmin />} />
            <Route path="/memberships" element={<MembershipsAdmin />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
