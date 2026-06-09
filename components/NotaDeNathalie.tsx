export function NotaDeNathalie({ children }: { children: React.ReactNode }) {
  return (
    <aside className="nathalie-note">
      <span>Nota de Nathalie</span>
      <p>{children}</p>
    </aside>
  );
}
