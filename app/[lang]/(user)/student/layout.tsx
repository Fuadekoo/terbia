export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Student folder is completely public - no authentication required
  // Anyone can access student routes without login
  return <>{children}</>; 
}
