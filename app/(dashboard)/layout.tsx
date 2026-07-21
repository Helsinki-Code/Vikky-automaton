import type { ReactNode } from "react";
import Nav from "../components/Nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-shell">
      <Nav />
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
