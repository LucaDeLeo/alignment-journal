import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-4xl font-bold tracking-tight">
        Alignment Journal
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A peer-reviewed journal for theoretical AI alignment research.
      </p>
    </main>
  )
}
