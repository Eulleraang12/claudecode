export const metadata = {
  title: 'Meta Ads Dashboard - Análise de Campanhas Instagram',
  description: 'Dashboard de análise de campanhas Meta/Instagram',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
