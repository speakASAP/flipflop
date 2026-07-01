export const metadata = {
  title: 'Blog | FlipFlop',
  description: 'Blog a zákaznické články FlipFlop.',
};

export default function BlogPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container mx-auto px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pro zákazníky</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-5xl">Blog</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Původní FlipFlop blog je zařazený mezi zákaznické odkazy ve footeru. Aktuální články zatím zůstávají na zdrojovém webu.
          </p>
          <a className="mt-6 inline-block text-sm font-semibold text-blue-700 underline underline-offset-4" href="https://www.flipflop.cz/cs/blog" target="_blank" rel="noreferrer">
            Otevřít blog na flipflop.cz
          </a>
        </div>
      </section>
    </main>
  );
}
