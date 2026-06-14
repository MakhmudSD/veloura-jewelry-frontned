import React, { useEffect } from 'react';
import Head from 'next/head';
import Top from '../Top';
import Footer from '../Footer';

import { Stack, Button, Link } from '@mui/material';
import { userVar } from '../../../apollo/store';
import { useReactiveVar } from '@apollo/client';
import { getJwtToken, updateUserInfo } from '../../auth';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { useTranslation } from 'next-i18next';

const withLayoutMain = (Component: any) => {
  return (props: any) => {
    const user = useReactiveVar(userVar);
    const { t, i18n } = useTranslation('common');
    const device = props.isMobile ? 'mobile' : 'desktop';

    /** LIFECYCLE **/
    useEffect(() => {
      const jwt = getJwtToken();
      if (jwt) updateUserInfo(jwt);
    }, []);

    /** SEO content per language **/
    const seo = {
      en: {
        title: 'Veloura – Discover Timeless Jewelry & Elegant Experiences',
        description:
          'Discover elegance with Veloura. Shop timeless necklaces, rings, bracelets, and earrings designed to shine every day.',
        url: 'https://veloura-jewelry.uz/',
        ogImage: 'https://veloura-jewelry.uz/img/banner/home-banner13.png',
      },
      uz: {
        title: 'Veloura – Nafislik va Zamonaviy Zargarlik',
        description:
          'Veloura bilan nafislikni kashf eting. Har kuni porlashingiz uchun mo‘ljallangan marjonlar, uzuklar, bilaguzuklar va sirg‘alarni toping.',
        url: 'https://veloura-jewelry.uz/uz/',
        ogImage: 'https://veloura-jewelry.uz/img/banner/home-banner13.png',
      },
      kr: {
        title: '벨로라 – 우아함과 현대적인 주얼리 경험',
        description: '벨로라와 함께 우아함을 발견하세요. 매일을 빛내는 목걸이, 반지, 팔찌, 귀걸이를 만나보세요.',
        url: 'https://veloura-jewelry.uz/kr/',
        ogImage: 'https://veloura-jewelry.uz/img/banner/home-banner13.png',
      },
    };

    const currentSeo = seo[i18n.language as 'en' | 'uz' | 'kr'] || seo.en;

    /** RENDER **/
    return (
      <>
        <Head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{currentSeo.title}</title>
          <meta name="description" content={currentSeo.description} />
          <meta name="robots" content="index, follow" />
          <meta
            property="og:locale"
            content={i18n.language === 'kr' ? 'ko_KR' : i18n.language === 'uz' ? 'uz_UZ' : 'en_US'}
          />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={currentSeo.title} />
          <meta property="og:description" content={currentSeo.description} />
          <meta property="og:url" content={currentSeo.url} />
          <meta property="og:site_name" content="Veloura-jewelry" />
          <meta property="og:image" content={currentSeo.ogImage} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <link rel="canonical" href={currentSeo.url} />
          <link rel="alternate" hrefLang="en" href="https://veloura-jewelry.uz/en/" />
          <link rel="alternate" hrefLang="uz" href="https://veloura-jewelry.uz/uz/" />
          <link rel="alternate" hrefLang="kr" href="https://veloura-jewelry.uz/kr/" />
        </Head>

        {device === 'mobile' ? (
          <Stack id="mobile-wrap">
            <Stack id="top">
              <Top />
            </Stack>
            <Stack id="main">
              <Component {...props} />
            </Stack>
            <Stack id="footer">
              <Footer />
            </Stack>
          </Stack>
        ) : (
          <Stack id="pc-wrap">
            <Stack id="top">
              <Top />
            </Stack>
            <Stack className="header-main">
              <div className="img-wrapper"></div>
              <div className="overlay-content">
                <h1>{t('Welcome to Veloura')}</h1>
                <p>{t('Discover the best products for your lifestyle')}</p>
                <Link href="/product" style={{ textDecoration: 'none' }}>
                  <Button variant="contained" className="shop-now-btn">
                    {t('SHOP NOW')}
                  </Button>
                </Link>
              </div>
            </Stack>
            <Stack id="main">
              <Component {...props} />
            </Stack>
            <Stack id="footer">
              <Footer />
            </Stack>
          </Stack>
        )}
      </>
    );
  };
};

export default withLayoutMain;
