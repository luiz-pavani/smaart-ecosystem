export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-white">
      {children}
    </div>
  )
}
