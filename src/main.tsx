import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    appearance={{
      variables: {
        colorPrimary: "#da7756",
        colorBackground: "#2b2a27",
        colorText: "#eeeeee",
        colorInputBackground: "#1f1e1b",
        colorInputText: "#eeeeee",
        borderRadius: "0.5rem",
      },
      elements: {
        card: { backgroundColor: "#1f1e1b", border: "1px solid rgba(255,255,255,0.08)" },
        formButtonPrimary: { backgroundColor: "#da7756", color: "#eeeeee" },
        footerActionLink: { color: "#da7756" },
        headerTitle: { color: "#eeeeee" },
        headerSubtitle: { color: "#a09f9a" },
        socialButtonsBlockButton: { backgroundColor: "#2b2a27", border: "1px solid rgba(255,255,255,0.08)", color: "#eeeeee" },
        formFieldLabel: { color: "#a09f9a" },
        formFieldInput: { backgroundColor: "#2b2a27", color: "#eeeeee", border: "1px solid rgba(255,255,255,0.08)" },
        dividerLine: { backgroundColor: "rgba(255,255,255,0.08)" },
        dividerText: { color: "#6b6a65" },
        identityPreview: { backgroundColor: "#2b2a27" },
        identityPreviewText: { color: "#eeeeee" },
        identityPreviewEditButton: { color: "#da7756" },
      },
    }}
  >
    <App />
  </ClerkProvider>
);
