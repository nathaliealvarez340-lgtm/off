export function NotaDeNathalie({ children }: { children: React.ReactNode }) {
  return (
    <aside className="nathalie-note">
      <span>Nota de Nathalie | Editora de OFF</span>
      <p>{children}</p>
    </aside>
  );
}
