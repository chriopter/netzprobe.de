import { ComingSoonPanel, SectionHeading } from '../sectionUi';

export default function RessourcenSection() {
  return <section id="section-ressourcen" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-6">
    <SectionHeading id="ressourcen"/>
    <ComingSoonPanel/>
  </section>;
}
