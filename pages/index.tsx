import { NextPage } from 'next';
import withLayoutMain from '../libs/components/layout/LayoutHome';
import { Stack } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import BrandsSection from '../libs/components/homepage/BrandSection';
import TrendProducts from '../libs/components/homepage/TrendProducts';
import IconWall from '../libs/components/homepage/IconWall';
import TopStores from '../libs/components/homepage/TopStores';
import Shipping from '../libs/components/homepage/Shipping';
import CategoryProducts from '../libs/components/homepage/CategoryProducts';
import Advertisement from '../libs/components/homepage/Advertisement';
import CommunityBoards from '../libs/components/homepage/CommunityBoards';
import DualNavigationCards from '../libs/components/homepage/DualCard';
import { useScrollReveal } from '../libs/hooks/useScrollReveal';
import useDeviceDetect from '../libs/hooks/useDeviceDetect';

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="v-fade-up" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const Home: NextPage<{ isMobile: boolean }> = () => {
  const device = useDeviceDetect();
  const isMobile = device === 'mobile';

  return (
    <Stack className="home-page">
      {isMobile ? (
        <>
          <RevealSection><BrandsSection /></RevealSection>
          <RevealSection delay={80}><TrendProducts /></RevealSection>
          <RevealSection delay={120}><IconWall /></RevealSection>
          <RevealSection delay={160}><TopStores /></RevealSection>
          <RevealSection delay={200}><Shipping /></RevealSection>
        </>
      ) : (
        <>
          <RevealSection><BrandsSection /></RevealSection>
          <RevealSection delay={80}><TrendProducts /></RevealSection>
          <RevealSection delay={120}><Advertisement /></RevealSection>
          <RevealSection delay={160}><IconWall /></RevealSection>
          <RevealSection delay={200}><CategoryProducts /></RevealSection>
          <RevealSection delay={240}><TopStores /></RevealSection>
          <RevealSection delay={280}><Shipping /></RevealSection>
          <RevealSection delay={320}><CommunityBoards /></RevealSection>
          <RevealSection delay={360}><DualNavigationCards /></RevealSection>
        </>
      )}
    </Stack>
  );
};

export default withLayoutMain(Home);
