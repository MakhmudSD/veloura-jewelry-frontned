import React, { useEffect, useRef, useState } from 'react';
import { Stack, Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import EastIcon from '@mui/icons-material/East';
import AnimatedSnackbar from '../common/Animations';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import { t } from 'i18next';
import dynamic from 'next/dynamic';

const HeroParticles = dynamic(() => import('./HeroParticles'), { ssr: false });

const BRANDS = [
  { name: 'Cartier', logoUrl: '/img/icons/brands/cariter.png' },
  { name: 'Bvlgari', logoUrl: '/img/icons/brands/bulgari2.png' },
  { name: 'Tiffany & Co.', logoUrl: '/img/icons/brands/tiffany3.png' },
  { name: 'Van Cleef & Arpels', logoUrl: '/img/icons/brands/vanCleef.png' },
  { name: 'YSL', logoUrl: '/img/icons/brands/tsl.png' },
];

function useParallax() {
  const [offsetY, setOffsetY] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return offsetY;
}

/** Single observer: section enters viewport → text reveals → cards bloom in after delay */
function useSectionReveal() {
  const [inView, setInView] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Cards bloom in 350ms after text starts revealing
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setAccordionOpen(true), 350);
    return () => clearTimeout(t);
  }, [inView]);

  return { inView, accordionOpen, ref };
}

const BrandsSection = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const parallaxY = useParallax();
  const { inView, accordionOpen, ref: sectionRef } = useSectionReveal();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleClick = (brandName: string) => {
    const input = {
      page: 1,
      limit: 9,
      sort: 'createdAt',
      direction: 'DESC',
      search: { brand: brandName.trim() },
    };
    setSnackbarMessage(`Searching for ${brandName} products...`);
    setOpenSnackbar(true);
    setTimeout(() => {
      router.push({ pathname: '/product', query: { input: JSON.stringify(input) } });
    }, 800);
  };

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  /* ---------------- MOBILE ---------------- */
  if (isMobile) {
    return (
      <>
        <Stack className="brands-section">
          <Stack className="container">
            <Box className="brands-top">
              <Typography component="span">{t('Attractive Jewelry') as string}</Typography>
              <Typography component="p">{t('Gorgeous Brands') as string}</Typography>
            </Box>

            <div className="card-box">
              <Swiper
                className="brands-swiper"
                slidesPerView={3}
                spaceBetween={12}
                centeredSlides={false}
                autoplay={{ delay: 3200, disableOnInteraction: false }}
                speed={600}
                breakpoints={{
                  0:   { slidesPerView: 3, spaceBetween: 10 },
                  600: { slidesPerView: 3, spaceBetween: 12 },
                  900: { slidesPerView: 5, spaceBetween: 16 },
                }}
                modules={[Autoplay]}
              >
                {BRANDS.map((brand) => (
                  <SwiperSlide key={brand.name} className="brand-slide">
                    <Box
                      className="brand-card interactive"
                      onClick={() => handleClick(brand.name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') handleClick(brand.name);
                      }}
                      aria-label={`View ${brand.name} products`}
                    >
                      <img src={brand.logoUrl} alt={brand.name} draggable="false" />
                    </Box>
                    <Typography className="brand-heading">{brand.name}</Typography>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <Typography className="brand-more-hint">
              Swipe to explore more <EastIcon fontSize="inherit" />
            </Typography>
          </Stack>
        </Stack>

        <AnimatedSnackbar
          open={openSnackbar}
          onClose={handleCloseSnackbar}
          message={snackbarMessage}
          severity="info"
        />
      </>
    );
  }

  /* ---------------- DESKTOP ---------------- */
  return (
    <>
      <Stack
        ref={sectionRef}
        className="brands-section"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <HeroParticles />

        {/* Whole container slides up + fades in when section enters viewport */}
        <Stack
          className="container"
          style={{
            position: 'relative',
            zIndex: 2,
            opacity: inView ? 1 : 0,
            transform: inView
              ? `translateY(${parallaxY * 0.08}px)`
              : `translateY(calc(${parallaxY * 0.08}px + 40px))`,
            transition: 'opacity 0.75s ease, transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <Box className="brands-top">
            {/* Eyebrow — reveals 100ms after section enters */}
            <Typography
              component="span"
              className="hero-eyebrow"
              style={{
                display: 'block',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
                transitionDelay: '100ms',
              }}
            >
              {t('Attractive Jewelry') as string}
            </Typography>

            {/* Heading — 250ms after */}
            <Typography
              component="p"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
                transitionDelay: '250ms',
              }}
            >
              {t('Gorgeous Brands') as string}
            </Typography>
          </Box>

          {/* Cards bloom in 350ms after section enters — controlled by accordionOpen */}
          <Box
            className={`brands-coverflow-wrap${accordionOpen ? ' brands-accordion-open' : ''}`}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 0.7s ease 400ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) 400ms',
            }}
          >
            <Swiper
              className="brands-coverflow"
              effect="coverflow"
              grabCursor
              centeredSlides
              slidesPerView={3.4}
              spaceBetween={0}
              loop
              speed={900}
              autoplay={{ delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true }}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 220,
                modifier: 2.6,
                slideShadows: false,
              }}
              modules={[EffectCoverflow, Autoplay]}
            >
              {[...BRANDS, ...BRANDS].map((brand, i) => (
                <SwiperSlide key={`${brand.name}-${i}`} className="brand-cf-slide">
                  <Box
                    className="brand-card interactive"
                    onClick={() => handleClick(brand.name)}
                    role="button"
                    tabIndex={i < BRANDS.length ? 0 : -1}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' || e.key === ' ') handleClick(brand.name);
                    }}
                  >
                    <img src={brand.logoUrl} alt={brand.name} draggable="false" />
                  </Box>
                  <Typography className="brand-heading">{brand.name}</Typography>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        </Stack>
      </Stack>

      <AnimatedSnackbar
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        severity="info"
      />
    </>
  );
};

export default BrandsSection;
