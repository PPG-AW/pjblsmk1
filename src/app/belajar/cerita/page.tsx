import { redirect } from "next/navigation";
import MarkDoneButton from "@/components/MarkDoneButton";
import ProductPhoto from "@/components/ProductPhoto";
import { getProgressItems } from "@/db/queries";
import { getSessionContext } from "@/lib/auth";
import {
  DRIVING_QUESTION,
  NO_FABRICATION_RULE,
  PEMANTIK_QUESTIONS,
  PROJECT_TITLE,
  STORY_CHAPTERS,
} from "@/lib/sptldv";

export const dynamic = "force-dynamic";

const PRODUCTS = [
  { name: "Roti", src: "/produk/roti.jpg", caption: "Roti, produk andalan D'Culinary" },
  { name: "Tahu walik", src: "/produk/tahu-walik.jpg", caption: "Tahu walik" },
  { name: "Risol", src: "/produk/risol.jpg", caption: "Risol" },
  { name: "Pempek", src: "/produk/pempek.jpg", caption: "Pempek" },
];

export default async function StoryPage() {
  const session = await getSessionContext();
  if (!session) redirect("/");
  if (session.kind === "teacher") redirect("/guru/dashboard");

  const progressItems = await getProgressItems(session.student.id);

  return (
    <div className="space-y-5">
      <section className="card">
        <p className="font-mono text-xs tracking-widest text-ember-400 uppercase">
          Fase Memahami · 1 dari 4 · Pertanyaan mendasar
        </p>
        <h1 className="mt-1 font-display text-2xl text-cream-100">Cerita masalah: D&apos;Culinary</h1>
        <p className="mt-2 max-w-3xl text-sm text-cream-200">{PROJECT_TITLE}</p>
        <p className="note mt-3">
          <strong>Pertanyaan utama proyek:</strong> {DRIVING_QUESTION}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STORY_CHAPTERS.map((chapter) => (
          <article key={chapter.id} className="card">
            <h2 className="section-title text-lg">{chapter.title}</h2>
            <p className="prose-block mt-2">{chapter.body}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2 className="section-title">Produk Tata Boga di D&apos;Culinary</h2>
        <p className="muted mt-1">
          D&apos;Culinary adalah unit usaha Jurusan Tata Boga. Berikut produk yang paling sering dibuat. Kelompokmu
          boleh menganalisis pasangan produk lain yang memakai bahan sama.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((product) => (
            <ProductPhoto key={product.name} src={product.src} alt={product.name} caption={product.caption} />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Pertanyaan pemantik</h2>
        <p className="muted mt-1">
          Renungkan dulu pertanyaan-pertanyaan ini sebelum masuk ke modul. Tidak perlu ditulis panjang. Yang
          penting kamu punya gambaran awal sebelum menyusun model matematika.
        </p>
        <ul className="prose-block mt-2 list-disc ps-5">
          {PEMANTIK_QUESTIONS.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
        <p className="note mt-3">{NO_FABRICATION_RULE}</p>
        <div className="mt-4">
          <MarkDoneButton item="cerita" alreadyDone={progressItems.has("cerita")} label="Tandai selesai" />
        </div>
      </section>
    </div>
  );
}
