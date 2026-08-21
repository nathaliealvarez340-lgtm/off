"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Trash2, X } from "lucide-react";
import { deleteCommunityMember, sendCommunityGreetingAction } from "@/app/actions";

export type CommunityMember = {
  id: string;
  kind: "user" | "subscriber";
  userId: string | null;
  name: string;
  email: string;
  offId: string | null;
  createdAt: string;
  preferredLanguage: string | null;
  role: "ADMIN" | "USER" | null;
  status: string;
  interest: string | null;
  commentCount: number;
  lastActivity: string | null;
  isCurrentAdmin: boolean;
};

const languageNames: Record<string, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  pt: "Português",
};

function formatLocalDate(value: string | null) {
  if (!value) return "Sin actividad registrada";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AdminCommunityManager({ members }: { members: CommunityMember[] }) {
  const router = useRouter();
  const [removedMembers, setRemovedMembers] = useState<string[]>([]);
  const [selected, setSelected] = useState<CommunityMember | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isGreeting, startGreeting] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  const visibleMembers = members.filter((member) => !removedMembers.includes(`${member.kind}-${member.id}`));

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isDeleting) return;
        event.preventDefault();
        if (confirmingDelete) setConfirmingDelete(false);
        else setSelected(null);
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [confirmingDelete, isDeleting, selected]);

  function openMember(member: CommunityMember) {
    setConfirmingDelete(false);
    setSelected(member);
  }

  function closeModal() {
    if (isDeleting) return;
    setConfirmingDelete(false);
    setSelected(null);
  }

  function sendGreeting() {
    if (!selected?.userId || isGreeting) return;
    startGreeting(async () => {
      const result = await sendCommunityGreetingAction(selected.userId!);
      setToast({ tone: result.ok ? "success" : "error", message: result.message });
    });
  }

  function confirmDelete() {
    if (!selected || isDeleting) return;
    const target = selected;
    startDeleting(async () => {
      const result = await deleteCommunityMember(target.id, target.kind);
      if (!result.ok) {
        setToast({ tone: "error", message: result.message });
        return;
      }

      setRemovedMembers((current) => [...current, `${target.kind}-${target.id}`]);
      setConfirmingDelete(false);
      setSelected(null);
      setToast({ tone: "success", message: result.message });
      router.refresh();
    });
  }

  return (
    <>
      <div className="subscriber-list">
        {visibleMembers.map((member) => (
          <div className="subscriber-row" key={`${member.kind}-${member.id}`}>
            <div className="profile-avatar" aria-hidden="true">{initials(member.name)}</div>
            <div>
              <button className="subscriber-name-button" type="button" onClick={() => openMember(member)}>
                {member.name}
              </button>
              <span>{member.email}</span>
            </div>
            <em>{member.role ?? member.interest ?? "Suscriptor"}</em>
          </div>
        ))}
        {visibleMembers.length === 0 ? (
          <div className="empty-dashboard-state">Aun no hay suscriptores ni usuarios registrados.</div>
        ) : null}
      </div>

      {selected ? (
        <div
          className="community-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !confirmingDelete) closeModal();
          }}
        >
          <div
            ref={dialogRef}
            className={`community-dialog ${confirmingDelete ? "is-destructive" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-dialog-title"
            aria-describedby="community-dialog-description"
          >
            {!confirmingDelete ? (
              <>
                <button className="community-dialog-close" type="button" onClick={closeModal} aria-label="Cerrar gestión de suscriptor">
                  <X aria-hidden="true" />
                </button>
                <header className="community-dialog-header">
                  <div className="profile-avatar" aria-hidden="true">{initials(selected.name)}</div>
                  <div>
                    <p>Comunidad OFF</p>
                    <h2 id="community-dialog-title">{selected.name}</h2>
                    <span id="community-dialog-description">{selected.email}</span>
                  </div>
                </header>

                <dl className="community-member-details">
                  <div><dt>OFF ID</dt><dd>{selected.offId ?? "No asignado"}</dd></div>
                  <div><dt>Miembro desde</dt><dd>{formatLocalDate(selected.createdAt)}</dd></div>
                  <div><dt>Idioma</dt><dd>{selected.preferredLanguage ? languageNames[selected.preferredLanguage] ?? selected.preferredLanguage : "No disponible"}</dd></div>
                  <div><dt>Estado</dt><dd>{selected.status}</dd></div>
                  <div><dt>Rol</dt><dd>{selected.role ?? "Suscriptor"}</dd></div>
                  <div><dt>Comentarios</dt><dd>{selected.commentCount}</dd></div>
                  <div className="wide"><dt>Última actividad</dt><dd>{formatLocalDate(selected.lastActivity)}</dd></div>
                </dl>

                <div className="community-dialog-actions">
                  <button
                    className="community-greeting-button"
                    type="button"
                    onClick={sendGreeting}
                    disabled={isGreeting || !selected.userId || selected.role === "ADMIN"}
                    title={!selected.userId ? "El suscriptor necesita una cuenta para recibir notificaciones internas" : undefined}
                  >
                    <Send aria-hidden="true" />
                    {isGreeting ? "Enviando..." : "Mandar saludo"}
                  </button>
                  <button
                    className="community-delete-button"
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={selected.isCurrentAdmin || selected.role === "ADMIN"}
                  >
                    <Trash2 aria-hidden="true" />
                    Borrar
                  </button>
                </div>
                {!selected.userId ? <p className="community-dialog-note">Este registro aún no tiene una cuenta de usuario; puede eliminarse, pero no recibir notificaciones internas.</p> : null}
                {selected.isCurrentAdmin ? <p className="community-dialog-note">No puedes eliminar tu propia cuenta desde Comunidad.</p> : null}
              </>
            ) : (
              <>
                <header className="community-delete-confirmation">
                  <span><Trash2 aria-hidden="true" /></span>
                  <p>Eliminación permanente</p>
                  <h2 id="community-dialog-title">¿Eliminar permanentemente a este usuario?</h2>
                  <div id="community-dialog-description">Se eliminará su cuenta y todos los registros asociados. Esta acción no se puede deshacer.</div>
                </header>
                <div className="community-dialog-actions confirmation-actions">
                  <button type="button" className="community-cancel-button" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>Cancelar</button>
                  <button type="button" className="community-delete-button" onClick={confirmDelete} disabled={isDeleting}>
                    {isDeleting ? "Eliminando..." : "Eliminar permanentemente"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {toast ? <div className={`admin-community-toast ${toast.tone}`} role="status">{toast.message}</div> : null}
    </>
  );
}
