const isBrowser = typeof window !== 'undefined';

export const REACT_APP_API_URL =
  (isBrowser ? process.env.NEXT_PUBLIC_API_URL : process.env.REACT_APP_API_URL) ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:3004';

export const REACT_APP_API_GRAPHQL_URL =
  (isBrowser ? process.env.NEXT_PUBLIC_API_GRAPHQL_URL : process.env.REACT_APP_API_GRAPHQL_URL) ||
  process.env.NEXT_PUBLIC_API_GRAPHQL_URL ||
  process.env.REACT_APP_API_GRAPHQL_URL ||
  `${REACT_APP_API_URL.replace(/\/+$/, '')}/graphql`;

export const REACT_APP_API_WS =
  (isBrowser ? process.env.NEXT_PUBLIC_API_WS : process.env.REACT_APP_API_WS) ||
  process.env.NEXT_PUBLIC_API_WS ||
  process.env.REACT_APP_API_WS ||
  `ws://localhost:3004/ws`;

// Optionally export site origin too
export const NEXT_PUBLIC_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000';

export const availableProductOptions = ['productBarter', 'productLimited'];

const thisYear = new Date().getFullYear();

export const productYears: number[] = [];
export const toDateRangeISOString = (startYear: number, endYear: number) => ({
	start: new Date(startYear, 0, 1).toISOString(),              // Jan 1, startYear 00:00:00
	end: new Date(endYear, 11, 31, 23, 59, 59, 999).toISOString(), // Dec 31, endYear 23:59:59.999
  });

for (let i = 2020; i <= thisYear; i++) {
	productYears.push(i);
}
export const ringSize: number[] = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
	11, 12, 13, 14, 15, 16, 17, 18, 19,
	20, 21, 22, 23, 24,
];

export const productWeight = [
	1.0, 1.5, 1.8,2.0, 2.2, 2.5, 2.7, 3.0, 3.3, 3.5, 3.8, 4.0, 4.2,
	4.5, 4.7, 5.0, 5.3, 5.5, 5.8, 6.0, 6.3, 6.5, 6.8, 7.0
  ];
export const productPrice: number[] = [];

const maxPrice = 20000000; // max price you want
const step = 50000; // step amount, you can adjust

for (let price = 0; price <= maxPrice; price += step) {
  productPrice.push(price);
}
export const Messages = {
	error1: 'Something went wrong!',
	error2: 'Please login first!',
	error3: 'Please fulfill all inputs!',
	error4: 'Message is empty!',
	error5: 'Only images with jpeg, jpg, png format allowed!',
};

export const topProductRank = 2

export const calculateStars = (comments: number, likes: number, views: number) =>
	Math.min(5, (comments + likes + views) / 3);

/** Resolve an image path from the DB — absolute URLs pass through unchanged,
 *  relative paths (locally uploaded files) are prefixed with the API origin. */
export const resolveImageUrl = (path: string | undefined | null, fallback = ''): string => {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) return path;
  return `${REACT_APP_API_URL}/${path}`;
};
