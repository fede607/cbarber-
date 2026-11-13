import { getSettings } from "@/lib/settings";
import { Header } from "./Header";
import { Footer } from "./Footer";

export async function Shell({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <Header name={s.businessName} />
      <main className="wrap min-h-[70vh] py-12 md:py-20">{children}</main>
      <Footer s={s} />
    </>
  );
}
