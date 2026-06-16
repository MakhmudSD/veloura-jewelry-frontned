import React, { useEffect, useState } from 'react';
import { Stack, Button, Typography, Box } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper';
import TopProductCard from './CategoryProductCard';
import { ProductsInquiry } from '../../types/product/product.input';
import { Product } from '../../types/product/product';
import { GET_PRODUCTS } from '../../../apollo/user/query';
import { useMutation, useQuery } from '@apollo/client';
import { T } from '../../types/common';
import { LIKE_TARGET_PRODUCT } from '../../../apollo/user/mutation';
import CategoryProductCard from './CategoryProductCard';
import { useTranslation } from 'next-i18next';

interface CategoryProductsProps {
  initialInput: ProductsInquiry;
}

const CategoryProducts = (props: CategoryProductsProps) => {
  const { initialInput } = props;
  const { t } = useTranslation('common');
  const device = useDeviceDetect();
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fixed backend category keys (never translated)
  const CATEGORY_KEYS = [
    'RING',
    'NECKLACE',
    'EARRINGS',
    'BRACELET',
    'DIAMOND',
    'GIFT',
    'WEDDING_RING',
  ];

  /** APOLLO REQUESTS **/
  const [likeTargetProduct] = useMutation(LIKE_TARGET_PRODUCT);

  const {
    loading: getProductsLoading,
    data: getProductsData,
    error: getProductsError,
    refetch: getProductsRefetch,
  } = useQuery(GET_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
    variables: { input: initialInput },
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (getProductsData?.getProducts?.list) setCategoryProducts(getProductsData.getProducts.list);
  }, [getProductsData]);

  /** HANDLERS **/
  const filteredProducts = selectedCategory
    ? categoryProducts.filter((p) => {
        if (Array.isArray(p.productCategory)) {
          return p.productCategory.includes(selectedCategory);
        }
        return p.productCategory === selectedCategory;
      })
    : categoryProducts;

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
  };

  if (device === 'mobile') {
    return (
      <Stack className={'category-products'}>
        <Stack className={'container'}>
          {/* Category Filter Buttons */}
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" justifyContent="center">
            {CATEGORY_KEYS.map((key) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleCategorySelect(key)}
              >
                <span className="page-locator" />
                {t(key).replace('_', ' ')}
              </Button>
            ))}
          </Stack>

          <Stack className={'info-box'}>
            <span>{t('Shop by Category')}</span>
            <h1>{t('Fresh Styles, Limitless Performance')}</h1>
            <p>
              {t(
                'Explore our latest collections, crafted with innovation and style, to elevate your workout game to new heights.'
              )}
            </p>
          </Stack>

          <Stack className={'card-box'}>
            <Swiper
              className={'category-product-swiper'}
              slidesPerView={1}
              centeredSlides={true}
              spaceBetween={15}
              modules={[Autoplay]}
            >
              {filteredProducts.map((product: Product) => (
                <SwiperSlide className={'category-product-slide'} key={product?._id}>
                  <TopProductCard product={product} />
                </SwiperSlide>
              ))}
            </Swiper>
          </Stack>
        </Stack>
      </Stack>
    );
  } else {
    return (
      <Stack className={'category-products'}>
        <Stack className={'container'}>
          <Stack className={'info-box'}>
            <h3>{t('Shop by Category')}</h3>
            <h1>{t('Fresh Styles, Limitless Performance')}</h1>
            <p>
              {t(
                'Explore our latest collections, crafted with innovation and style, to elevate your workout game to new heights.'
              )}
            </p>
            <div className="heading-underline" />

            <Stack className="category-filter-buttons">
              {CATEGORY_KEYS.map((key) => (
                <Button
                  key={key}
                  className={`category-filter-button ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(key)}
                >
                  <span className="page-locator" />
                  {t(key).replace('_', ' ')}
                </Button>
              ))}
            </Stack>
          </Stack>
          <Stack className={'card-box'}>
            {filteredProducts.length === 0 ? (
              <Box className="no-products-message">
                <img src="/img/icons/no-jewelry2.png" alt="" />
              </Box>
            ) : (
              <Swiper
                className={'top-product-swiper'}
                slidesPerView={1}
                spaceBetween={15}
                centeredSlides={true}
                modules={[Autoplay, Navigation, Pagination]}
                navigation={{
                  nextEl: '.swiper-top-next',
                  prevEl: '.swiper-top-prev',
                }}
                pagination={{
                  el: '.swiper-top-pagination',
                }}
              >
                {filteredProducts.map((product: Product) => (
                  <SwiperSlide className={'top-product-slide'} key={product?._id}>
                    <CategoryProductCard product={product} />
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </Stack>
        </Stack>
      </Stack>
    );
  }
};

CategoryProducts.defaultProps = {
  initialInput: {
    page: 1,
    limit: 8,
    sort: 'productRank',
    direction: 'DESC',
    search: {},
  },
};

export default CategoryProducts;
