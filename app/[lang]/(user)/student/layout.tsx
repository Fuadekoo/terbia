import Script from 'next/script';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Student folder is completely public - no authentication required
  // Anyone can access student routes without login
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js?59"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
