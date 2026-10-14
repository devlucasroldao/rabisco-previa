// Remonta a cada navegação: a página nova entra com um fade curto e um leve
// deslocamento (só opacity e transform; some com movimento reduzido).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
