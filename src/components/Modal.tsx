import { useEffect, type ReactNode } from "react";

interface ModalProps {
  show: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "lg" | "xl";
  footer?: ReactNode;
  closable?: boolean;
}

export function Modal({
  show,
  title,
  onClose,
  children,
  size,
  footer,
  closable = true,
}: ModalProps) {
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  const dialogClass =
    size === "lg"
      ? "modal-dialog modal-lg"
      : size === "xl"
        ? "modal-dialog modal-xl"
        : size === "sm"
          ? "modal-dialog modal-sm"
          : "modal-dialog";

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className={dialogClass} role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              {closable && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                />
              )}
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      {closable && (
        <div className="modal-backdrop fade show" onClick={onClose} />
      )}
      {!closable && <div className="modal-backdrop fade show" />}
    </>
  );
}
