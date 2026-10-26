import Hero from '@/components/sections/Hero';
import {
  StorySection,
  SpacesSection,
  CastSection,
  PullQuote,
} from '@/components/sections/NarrativeSections';
import {
  ShowingsSection,
  GuideSection,
  JoinSection,
} from '@/components/sections/DataSections';
import {
  SoundSection,
  GallerySection,
  MessageSection,
  MyTheatreSection,
} from '@/components/sections/MediaSections';

/**
 * 首页：《蔡锷与小凤仙》庭院音乐剧
 * 板块顺序：Hero → 近期场次 → THE STORY → TWO SPACES → THE CAST
 *          → 引言 → SHOWINGS → GUIDE → ORIGINAL SOUND → SCORE GALLERY
 *          → JOIN US → MESSAGE → MY THEATRE
 */
export default function Home() {
  return (
    <>
      <Hero />
      <ShowingsSection variant="recent" />
      <StorySection />
      <SpacesSection />
      <CastSection />
      <PullQuote />
      <ShowingsSection />
      <GuideSection />
      <SoundSection />
      <GallerySection />
      <JoinSection />
      <MessageSection />
      <MyTheatreSection />
    </>
  );
}
