import { X } from "lucide-react";
import React from "react";

interface ModalProps {
  title?: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({
  title,
  subtitle,
  isOpen,
  onClose,
  children,
  footer,
  width,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-back">
      <section className="modal" style={width ? { maxWidth: width } : undefined}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        {subtitle && <span className="eyebrow">{subtitle}</span>}
        {title && <h2>{title}</h2>}
        {children}
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}
