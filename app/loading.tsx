import LogoLoadingSpinner from "@/components/LogoLoadingSpinner"

export default function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <LogoLoadingSpinner />
    </div>
  )
}
