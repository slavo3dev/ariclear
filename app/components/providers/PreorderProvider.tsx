"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Modal, PreorderForm } from "@ariclear/components";

const PreorderContext = createContext({
  open: () => {},
  close: () => {},
});

export const usePreorder = () => useContext(PreorderContext);

export function PreorderProvider({ children }: { children: React.ReactNode }) {
  const [openModal, setOpenModal] = useState(false);

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
        open: () => setOpenModal(true),
        close: () => setOpenModal(false),
      }}
    >
      {children}

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <PreorderForm onSuccess={() => setOpenModal(false)} />
      </Modal>
    </PreorderContext.Provider>
  );
}
