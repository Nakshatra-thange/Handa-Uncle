import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage";
import { EditPage } from "./pages/EditPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);