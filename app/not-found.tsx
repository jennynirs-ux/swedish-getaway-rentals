import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Link href="/" className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90">
        Go Home
      </Link>
    </div>
  );
}
