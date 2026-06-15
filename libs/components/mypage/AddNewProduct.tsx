import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import {
  ProductCategory,
  ProductGender,
  ProductLocation,
  ProductMaterial,
} from '../../enums/product.enum';
import { resolveImageUrl } from '../../config';
import axios from 'axios';
import { getJwtToken } from '../../auth';
import { sweetErrorHandling, sweetMixinErrorAlert, sweetMixinSuccessAlert } from '../../sweetAlert';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';
import { CREATE_PRODUCT, UPDATE_PRODUCT } from '../../../apollo/user/mutation';
import { GET_PRODUCT } from '../../../apollo/user/query';

type InsertState = {
  _id?: string; // only for update
  productTitle: string;
  productPrice: number;
  productCategory?: ProductCategory | '';
  productLocation?: ProductLocation | '';
  productAddress?: string;
  productBarter?: boolean;
  productLimited?: boolean;
  productMaterial?: ProductMaterial | '';
  productGender?: ProductGender | '';
  productWeightUnit?: number; // can be 0
  productDesc?: string;
  productImages: string[];
  productSize?: number;
  productStock?: number;
  productOrigin?: string;
  productColor?: string;
};

const AddNewProduct = ({ initialValues, ...props }: any) => {
  const device = useDeviceDetect();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [insertProductData, setInsertProductData] = useState<InsertState>(initialValues);
  const [productCategory] = useState<ProductCategory[]>(Object.values(ProductCategory));
  const [productLocation] = useState<ProductLocation[]>(Object.values(ProductLocation));
  const token = getJwtToken();
  const user = useReactiveVar(userVar);

  /** APOLLO **/
  const [createProduct] = useMutation(CREATE_PRODUCT);
  const [updateProduct] = useMutation(UPDATE_PRODUCT);

  // 🔧 Adjust variables shape if your GET_PRODUCT uses a different arg name
  const {
    loading: getProductLoading,
    data: getProductData,
    error: getProductError,
    refetch: getProductRefetch,
  } = useQuery(GET_PRODUCT, {
    skip: !router.query.productId,
    fetchPolicy: 'network-only',
    variables: { id: router.query.productId }, // <-- change to { input: ... } if your schema expects it
  });

  /** LIFECYCLES **/
  useEffect(() => {
    if (!getProductLoading && getProductData?.getProduct) {
      const p = getProductData.getProduct;
      // functional update prevents stale state issues
      setInsertProductData((prev) => ({
        ...prev,
        _id: p._id, // needed for update payload
        productTitle: p.productTitle ?? '',
        productPrice: p.productPrice ?? 0,
        productWeightUnit: typeof p.productWeightUnit === 'number' ? p.productWeightUnit : 0,
        productCategory: p.productCategory ?? '',
        productLocation: p.productLocation ?? '',
        productOrigin: p.productOrigin ?? '',
        productAddress: p.productAddress ?? '',
        productBarter: !!p.productBarter,
        productLimited: !!p.productLimited,
        productMaterial: p.productMaterial ?? '',
        productGender: p.productGender ?? '',
        productColor: p.productColor ?? '',
        productSize: typeof p.productSize === 'number' ? p.productSize : 0,
        productStock: typeof p.productStock === 'number' ? p.productStock : 0,
        productDesc: p.productDesc ?? '',
        productImages: Array.isArray(p.productImages) ? p.productImages : [],
      }));
    }
  }, [getProductLoading, getProductData]);

  /** HANDLERS **/
  async function uploadImages() {
    try {
      const files = inputRef.current?.files;
      if (!files || files.length === 0) return;

      if (files.length > 5) throw new Error('Cannot upload more than 5 images!');

      const formData = new FormData();

      // dynamic operations/map based on actual file count
      const ops = {
        query: `mutation ImagesUploader($files: [Upload!]!, $target: String!) { 
          imagesUploader(files: $files, target: $target)
        }`,
        variables: {
          files: new Array(files.length).fill(null),
          target: 'product',
        },
      };

      const map: Record<string, string[]> = {};
      for (let i = 0; i < files.length; i++) {
        map[String(i)] = [`variables.files.${i}`];
      }

      formData.append('operations', JSON.stringify(ops));
      formData.append('map', JSON.stringify(map));
      for (let i = 0; i < files.length; i++) {
        formData.append(String(i), files[i]);
      }

      // If you're in Next.js, env var must be NEXT_PUBLIC_... to be available on client
      const gqlUrl = process.env.NEXT_PUBLIC_API_GRAPHQL_URL || process.env.REACT_APP_API_GRAPHQL_URL;
      if (!gqlUrl) throw new Error('GraphQL upload URL is not configured');

      const response = await axios.post(`${gqlUrl}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'apollo-require-preflight': 'true',
          Authorization: `Bearer ${token}`,
        },
      });

      const responseImages = response?.data?.data?.imagesUploader || [];
      setInsertProductData((prev) => ({
        ...prev,
        productImages: [...(prev.productImages || []), ...responseImages],
      }));
    } catch (err: any) {
      await sweetMixinErrorAlert(err.message || 'Upload failed');
    }
  }

  const doDisabledCheck = () => {
    // Backend: address/desc are optional; enums must be set to valid enum (not '')
    const titleOk = !!insertProductData.productTitle.trim();
    const priceOk = Number.isFinite(insertProductData.productPrice) && insertProductData.productPrice >= 0;
    const catOk = insertProductData.productCategory !== undefined && insertProductData.productCategory !== null;
    const locOk = !!insertProductData.productLocation && Object.values(ProductLocation).includes(insertProductData.productLocation as ProductLocation);
    const materialOk = !!insertProductData.productMaterial && Object.values(ProductMaterial).includes(insertProductData.productMaterial as ProductMaterial);
    const genderOk = !!insertProductData.productGender && Object.values(ProductGender).includes(insertProductData.productGender as ProductGender);
    const stockOk = Number.isFinite(insertProductData.productStock ?? 0) && (insertProductData.productStock ?? 0) >= 0;
    const imgsOk = (insertProductData.productImages?.length ?? 0) > 0;

    return !(titleOk && priceOk && catOk && locOk && materialOk && genderOk && stockOk && imgsOk);
  };

  const buildCreatePayload = (s: InsertState) => {
    // omit _id and undefined/empty enum values
    return {
      productTitle: s.productTitle,
      productPrice: s.productPrice,
      productCategory: s.productCategory as ProductCategory,
      productLocation: s.productLocation as ProductLocation,
      productAddress: s.productAddress || undefined,
      productBarter: !!s.productBarter,
      productLimited: !!s.productLimited,
      productMaterial: s.productMaterial as ProductMaterial,
      productGender: s.productGender as ProductGender,
      productWeightUnit: typeof s.productWeightUnit === 'number' ? s.productWeightUnit : undefined,
      productDesc: (s.productDesc || '').trim() || undefined,
      productImages: s.productImages,
      productSize: typeof s.productSize === 'number' ? s.productSize : undefined,
      productStock: typeof s.productStock === 'number' ? s.productStock : 0,
      productOrigin: s.productOrigin || undefined,
      productColor: s.productColor || undefined,
    };
  };

  const buildUpdatePayload = (s: InsertState) => {
    return {
      _id: s._id, // required by UpdateProductInput
      productTitle: s.productTitle,
      productPrice: s.productPrice,
      productCategory: s.productCategory || undefined,
      productLocation: s.productLocation || undefined,
      productAddress: s.productAddress || undefined,
      productBarter: s.productBarter,
      productLimited: s.productLimited,
      productMaterial: s.productMaterial || undefined,
      productGender: s.productGender || undefined,
      productWeightUnit: typeof s.productWeightUnit === 'number' ? s.productWeightUnit : undefined,
      productDesc: (s.productDesc || '').trim() || undefined,
      productImages: s.productImages,
      productSize: typeof s.productSize === 'number' ? s.productSize : undefined,
      productStock: typeof s.productStock === 'number' ? s.productStock : undefined,
      productOrigin: s.productOrigin || undefined,
      productColor: s.productColor || undefined,
    };
  };

  const insertProductHandler = useCallback(async () => {
    try {
      const payload = buildCreatePayload(insertProductData);
      await createProduct({ variables: { input: payload } });
      await sweetMixinSuccessAlert('Created successfully!');
      await router.push({ pathname: '/mypage', query: { category: 'myProducts' } });
    } catch (err) {
      sweetErrorHandling(err);
    }
  }, [insertProductData]);

  const updateProductHandler = useCallback(async () => {
    try {
      const payload = buildUpdatePayload(insertProductData);
      if (!payload._id) throw new Error('Missing product id for update');
      await updateProduct({ variables: { input: payload } });
      await sweetMixinSuccessAlert('Product updated successfully!');
      await router.push({ pathname: '/mypage', query: { category: 'myProducts' } });
    } catch (err: any) {
      await sweetMixinErrorAlert(err.message || 'Update failed');
    }
  }, [insertProductData]);

  if (user?.memberType !== 'STORE') {
    router.back();
    return null;
  }

  if (device === 'mobile') {
    return <div>ADD NEW product MOBILE PAGE</div>;
  }

  return (
    <div id="add-product-page">
      <Stack className="main-title-box">
        <Typography className="main-title">Add New product</Typography>
        <Typography className="sub-title">We are glad to see you again!</Typography>
      </Stack>

      <div>
        <Stack className="config">
          <Stack className="description-box">
            <Stack className="config-column">
              <Typography className="title">Title</Typography>
              <input
                type="text"
                className="description-input"
                placeholder={'Title'}
                value={insertProductData.productTitle}
                onChange={({ target: { value } }) =>
                  setInsertProductData((p) => ({ ...p, productTitle: value }))
                }
              />
            </Stack>

            <Stack className="config-row">
            <Stack className="price-year-after-price">
  <Typography className="title">Price (KRW)</Typography>
  <input
    type="text"
    className="description-input"
    placeholder="Price"
    value={insertProductData.productPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
    onChange={({ target: { value } }) => {
      // Remove spaces and any non-digit characters
      const numericValue = value.replace(/\D/g, '');
      // Update numeric state only
      setInsertProductData((p) => ({
        ...p,
        productPrice: Number(numericValue) || 0,
      }));
    }}
  />
</Stack>
              <Stack className="price-year-after-price">
                <Typography className="title">Select Type</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productCategory || 'select'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({
                      ...p,
                      productCategory: value === 'select' ? '' : (value as ProductCategory),
                    }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  {productCategory.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
            </Stack>

            <Stack className="config-row">
              <Stack className="price-year-after-price">
                <Typography className="title">Select Location</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productLocation || 'select'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({
                      ...p,
                      productLocation: value === 'select' ? '' : (value as ProductLocation),
                    }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  {productLocation.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
              <Stack className="price-year-after-price">
                <Typography className="title">Address</Typography>
                <input
                  type="text"
                  className="description-input"
                  placeholder={'Address (optional)'}
                  value={insertProductData.productAddress || ''}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({ ...p, productAddress: value }))
                  }
                />
              </Stack>
            </Stack>

            <Stack className="config-row">
              <Stack className="price-year-after-price">
                <Typography className="title">Barter</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productBarter ? 'yes' : 'no'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({ ...p, productBarter: value === 'yes' }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  <option value={'yes'}>Yes</option>
                  <option value={'no'}>No</option>
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
              <Stack className="price-year-after-price">
                <Typography className="title">Limited Edition</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productLimited ? 'yes' : 'no'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({ ...p, productLimited: value === 'yes' }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  <option value={'yes'}>Yes</option>
                  <option value={'no'}>No</option>
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
            </Stack>

            <Stack className="config-row">
              <Stack className="price-year-after-price">
                <Typography className="title">Material</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productMaterial || 'select'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({
                      ...p,
                      productMaterial: value === 'select' ? '' : (value as ProductMaterial),
                    }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  {(['GOLD', 'SILVER', 'DIAMOND', 'PLATINIUM'] as const).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
              <Stack className="price-year-after-price">
                <Typography className="title">Gender</Typography>
                <select
                  className={'select-description'}
                  value={insertProductData.productGender || 'select'}
                  onChange={({ target: { value } }) =>
                    setInsertProductData((p) => ({
                      ...p,
                      productGender: value === 'select' ? '' : (value as ProductGender),
                    }))
                  }
                >
                  <option disabled value={'select'}>
                    Select
                  </option>
                  {Object.values(ProductGender).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <div className={'divider'}></div>
                <img src={'/img/icons/Vector.svg'} className={'arrow-down'} />
              </Stack>
              <Stack className="price-year-after-price">
  <Typography className="title">Weight (g)</Typography>
  <input
    type="text"
    className="description-input"
    placeholder="Enter weight"
    value={(insertProductData.productWeightUnit ?? 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
    onChange={({ target: { value } }) => {
      // Remove all non-digit characters
      const numericValue = value.replace(/\D/g, '');
      // Update numeric state only
      setInsertProductData((p) => ({
        ...p,
        productWeightUnit: Number(numericValue) || 0,
      }));
    }}
  />
</Stack>

            </Stack>

            <Stack className="config-column">
              <Typography className="title">Description</Typography>
              <textarea
                className="description-text"
                value={insertProductData.productDesc || ''}
                onChange={({ target: { value } }) =>
                  setInsertProductData((p) => ({ ...p, productDesc: value }))
                }
              />
            </Stack>
          </Stack>

          <Typography className="upload-title">Upload photos of your product</Typography>
          <Stack className="images-box">
            <Stack className="upload-box">
              {/* (SVG unchanged) */}
              <Stack className="text-box">
                <Typography className="drag-title">Drag and drop images here</Typography>
                <Typography className="format-title">
                  Photos must be JPEG or PNG format and at least 2048x768
                </Typography>
              </Stack>
              <Button className="browse-button" onClick={() => inputRef.current?.click()}>
                <Typography className="browse-button-text">Browse Files</Typography>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  onChange={uploadImages}
                  multiple
                  accept="image/jpg, image/jpeg, image/png"
                />
              </Button>
            </Stack>

            <Stack className="gallery-box">
              {insertProductData?.productImages.map((image: string) => {
                const imagePath: string = resolveImageUrl(image, '/img/product/no-image.png');
                return (
                  <Stack key={image} className="image-box">
                    <img src={imagePath} alt="" />
                  </Stack>
                );
              })}
            </Stack>
          </Stack>

          <Stack className="buttons-row">
            {router.query.productId ? (
              <Button className="next-button" disabled={doDisabledCheck()} onClick={updateProductHandler}>
                <Typography className="next-button-text">Save</Typography>
              </Button>
            ) : (
              <Button className="next-button" disabled={doDisabledCheck()} onClick={insertProductHandler}>
                <Typography className="next-button-text">Save</Typography>
              </Button>
            )}
          </Stack>
        </Stack>
      </div>
    </div>
  );
};

AddNewProduct.defaultProps = {
  initialValues: {
    productTitle: '',
    productPrice: 0,
    productCategory: '', // keep empty until user selects a valid enum
    productLocation: '',
    productAddress: '',
    productBarter: false,
    productLimited: false,
    productMaterial: '',
    productGender: '',
    productWeightUnit: 0, // 0 is valid
    productDesc: '',
    productImages: [],
    productSize: 0,
    productStock: 0,
    productOrigin: '',
    productColor: '',
  } as InsertState,
};

export default AddNewProduct;
