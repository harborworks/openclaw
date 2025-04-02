import { Link, Route, Routes, useLocation } from "react-router-dom";

import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { MembershipsAdmin, OrgsAdmin, UsersAdmin } from "./admin";

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
        <Routes>
          <Route path="/" element={<UsersAdmin />} />
          <Route path="/users" element={<UsersAdmin />} />
          <Route path="/orgs" element={<OrgsAdmin />} />
          <Route path="/memberships" element={<MembershipsAdmin />} />
        </Routes>
      </div>
    </div>
  );
}
