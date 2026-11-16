"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Modal, PreorderForm } from "@ariclear/components";

/** Which plan the contact form is about. Defaults to Centurion. */
export type ContactPlan = "starter" | "pro" | "legion";

const PreorderContext = createContext<{
  open: (plan?: ContactPlan) => void;
  close: () => void;
}>({
  open: () => {},
  close: () => {},
});

export const usePreorder = () => useContext(PreorderContext);

export function PreorderProvider({ children }: { children: React.ReactNode }) {
  const [openModal, setOpenModal] = useState(false);
  const [plan, setPlan] = useState<ContactPlan | null>(null);

  // Auto open on first visit
  useEffect(() => {
    const seen = localStorage.getItem("ariclear_preorder_popup_seen");
    if (!seen) {
      setTimeout(() => setOpenModal(true), 600); // small delay for nicer effect
      localStorage.setItem("ariclear_preorder_popup_seen", "true");
    }
  }, []);

  return (
    <PreorderContext.Provider
      value={{
        open: (p?: ContactPlan) => {
          setPlan(p ?? null);
          setOpenModal(true);
        },
        close: () => setOpenModal(false),
      }}
    >
      {children}

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <PreorderForm tier={plan} onSuccess={() => setOpenModal(false)} />
      </Modal>
    </PreorderContext.Provider>
  );
}
