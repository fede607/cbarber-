import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap grid min-h-dvh place-items-center py-20 text-center">
      <div>
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="display text-5xl md:text-7xl">Esta página no existe</h1>
        <p className="mx-auto mt-5 max-w-md text-ash">Puede que el enlace haya caducado o esté mal escrito.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Ir al inicio
          </Link>
          <Link href="/reservar" className="btn btn-ghost">
            Reservar cita
          </Link>
        </div>
      </div>
    </main>
  );
}
