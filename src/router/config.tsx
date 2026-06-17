import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import LoginPage from "../pages/login/page";
import ForgotPasswordPage from "../pages/login/forgot-password";
import ResetPasswordPage from "../pages/login/reset-password";
import InspectionsPage from "../pages/inspections/page";
import InspectionDetailPage from "../pages/inspections/detail";
import NewInspectionPage from "../pages/inspections/new";
import PerformInspectionPage from "../pages/inspections/perform";
import SchedulePage from "../pages/schedule/page";
import AssetsPage from "../pages/assets/page";
import AssetDetailPage from "../pages/assets/detail";
import ReportsPage from "../pages/reports/page";
import CompliancePage from "../pages/compliance/page";
import UsersPage from "../pages/users/page";
import CustomersPage from "../pages/customers/page";
import CustomerDetailPage from "../pages/customers/detail";
import ScheduleInspectionPage from "../pages/customers/schedule";
import DeficienciesPage from "../pages/deficiencies/page";
import ProposalsPage from "../pages/proposals/page";
import WorkOrdersPage from "../pages/work-orders/page";
import WorkOrderDetailPage from "../pages/work-orders/detail";
import InvoicesPage from "../pages/invoices/page";
import CustomerPortalPage from "../pages/portal/page";
import DispatchPage from "../pages/dispatch/page";
import PaymentPage from "../pages/payments/page";
import RecurringSchedulesPage from "../pages/recurring-schedules/page";
import AuditLogsPage from "../pages/audit-logs/page";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/payments",
    element: <PaymentPage />,
  },
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/inspections",
    element: <InspectionsPage />,
  },
  {
    path: "/inspections/new",
    element: <NewInspectionPage />,
  },
  {
    path: "/inspections/:id/perform",
    element: <PerformInspectionPage />,
  },
  {
    path: "/inspections/:id",
    element: <InspectionDetailPage />,
  },
  {
    path: "/schedule",
    element: <SchedulePage />,
  },
  {
    path: "/assets",
    element: <AssetsPage />,
  },
  {
    path: "/assets/:id",
    element: <AssetDetailPage />,
  },
  {
    path: "/reports",
    element: <ReportsPage />,
  },
  {
    path: "/compliance",
    element: <CompliancePage />,
  },
  {
    path: "/users",
    element: <UsersPage />,
  },
  {
    path: "/customers",
    element: <CustomersPage />,
  },
  {
    path: "/customers/:id/schedule",
    element: <ScheduleInspectionPage />,
  },
  {
    path: "/customers/:id",
    element: <CustomerDetailPage />,
  },
  {
    path: "/deficiencies",
    element: <DeficienciesPage />,
  },
  {
    path: "/proposals",
    element: <ProposalsPage />,
  },
  {
    path: "/work-orders",
    element: <WorkOrdersPage />,
  },
  {
    path: "/work-orders/:id",
    element: <WorkOrderDetailPage />,
  },
  {
    path: "/invoices",
    element: <InvoicesPage />,
  },
  {
    path: "/portal",
    element: <CustomerPortalPage />,
  },
  {
    path: "/dispatch",
    element: <DispatchPage />,
  },
  {
    path: "/recurring-schedules",
    element: <RecurringSchedulesPage />,
  },
  {
    path: "/audit-logs",
    element: <AuditLogsPage />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;