import React, { useEffect, useRef, useState } from 'react';
import { Stack, Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import EastIcon from '@mui/icons-material/East';
import AnimatedSnackbar from '../common/Animations';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper';
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

function useTextReveal(count: number) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(timer);
  }, []);
  return { revealed, ref };
}

const BrandsSection = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const parallaxY = useParallax();
  const { revealed, ref: sectionRef } = useTextReveal(2);

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
                autoplay={{ delay: 3500, disableOnInteraction: false }}
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
        {/* Gold particle field — positioned absolute, pointer-events none */}
        <HeroParticles />

        <Stack
          className="container"
          style={{
            position: 'relative',
            zIndex: 2,
            transform: `translateY(${parallaxY * 0.08}px)`,
            transition: 'transform 0.1s linear',
          }}
        >
          <Box className="brands-top">
            {/* Staggered text reveal on load */}
            <Typography
              component="span"
              className={`hero-eyebrow${revealed ? ' v-revealed' : ''}`}
              style={{
                display: 'block',
                opacity: 0,
                transform: 'translateY(20px)',
                transition: 'opacity 0.7s ease, transform 0.7s ease',
                transitionDelay: '0ms',
                ...(revealed ? { opacity: 1, transform: 'translateY(0)' } : {}),
              }}
            >
              {t('Attractive Jewelry') as string}
            </Typography>
            <Typography
              component="p"
              style={{
                opacity: 0,
                transform: 'translateY(24px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
                transitionDelay: '200ms',
                ...(revealed ? { opacity: 1, transform: 'translateY(0)' } : {}),
              }}
            >
              {t('Gorgeous Brands') as string}
            </Typography>
          </Box>

          <Stack
            className="card-box"
            style={{
              opacity: 0,
              transform: 'translateY(28px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
              transitionDelay: '400ms',
              ...(revealed ? { opacity: 1, transform: 'translateY(0)' } : {}),
            }}
          >
            {BRANDS.map((brand, i) => (
              <Box
                key={brand.name}
                className="brand-item"
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  transitionDelay: `${500 + i * 100}ms`,
                  ...(revealed ? { opacity: 1, transform: 'translateY(0)' } : {}),
                }}
              >
                <Box
                  className="brand-card interactive"
                  onClick={() => handleClick(brand.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter' || e.key === ' ') handleClick(brand.name);
                  }}
                >
                  <img src={brand.logoUrl} alt={brand.name} draggable="false" />
                </Box>
                <Typography className="brand-heading">{brand.name}</Typography>
              </Box>
            ))}
          </Stack>
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
