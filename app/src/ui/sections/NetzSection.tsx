import { ComingSoonPanel, SectionHeading } from '../sectionUi';

export default function NetzSection() {
  return <section id="section-netz" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-6">
    <SectionHeading id="netz"/>
    <ComingSoonPanel/>
  </section>;
}
