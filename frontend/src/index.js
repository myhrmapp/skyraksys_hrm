import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import App from "./App";
import { queryClient } from "./config/queryClient";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Use a data router so that hooks like useBlocker work correctly.
// App renders its own <Routes> tree and is mounted as the sole route element.
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <QueryClientProvider client={queryClient}>
        <App />
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    ),
  },
]);

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
);
