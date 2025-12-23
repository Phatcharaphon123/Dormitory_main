import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";

// import


const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="login" replace /> },
    ],
  },
  {
    path: "/ownerdorm",
    element: (
      <ProtectRouteOwnerDorm>
        <LayoutOwnerDorm />
      </ProtectRouteOwnerDorm>
    ), 
    children: [
      { index: true, element: <Dashboard /> },

    ],
  },
  {
    path: '/admin/:dormId',
      element: (
        <ProtectRouteAdminOrOwnerDorm>
            <LayoutDormManage/>
        </ProtectRouteAdminOrOwnerDorm>
      ),
      children: [
      { index: true, element: <DashboardDorm /> },

    ]
  }
]);

const AppRoutes = () => {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
};

export default AppRoutes;
