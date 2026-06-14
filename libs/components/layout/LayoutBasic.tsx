import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import Head from 'next/head';
import Top from '../Top';
import Footer from '../Footer';
import { Stack } from '@mui/material';
import { getJwtToken, updateUserInfo } from '../../auth';
import Chat from '../Chat';
import { useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const LuxuryPageBanner = dynamic(() => import('../common/LuxuryPageBanner'), { ssr: false });

const withLayoutBasic = (Component: any) => {
	return (props: any) => {
		const router = useRouter();
		const { t, i18n } = useTranslation('common');
		const device = useDeviceDetect();
		const [authHeader, setAuthHeader] = useState<boolean>(false);
		const user = useReactiveVar(userVar);

		const memoizedValues = useMemo(() => {
			let title = '',
				desc = '',
				bgImage = '';

			switch (router.pathname) {
				case '/product':
					title = 'Products';
					desc = 'Home / Products';
					bgImage = '/img/banner/banner-bg.png';
					break;
				case '/store':
					title = 'Stores';
					desc = 'Home / Stores';
					bgImage = '/img/banner/store.png';
					break;
				case '/store/detail':
					title = 'Store Page';
					desc = 'Home / Store Details';
					bgImage = '/img/banner/store-detail.png';
					break;
				case '/mypage':
					title = 'my page';
					desc = 'Home / My Page';
					bgImage = '/img/banner/myPage.png';
					break;
				case '/community':
					title = 'Community';
					desc = 'Home / Community';
					bgImage = '/img/banner/community.png';
					break;
				case '/community/detail':
					title = 'Community Detail';
					desc = 'Home / For Community Detail';
					bgImage = '/img/banner/community-detail.png';
					break;
				case '/cs':
					title = 'CS';
					desc = 'Home / Customer Service';
					bgImage = '/img/banner/cs.png';
					break;
				case '/account/join':
					title = 'Login/Signup';
					bgImage = '/img/banner/login.png';
					setAuthHeader(true);
					break;
				case '/member':
					title = 'Member Page';
					desc = 'Home / Member Page';
					bgImage = '/img/banner/member-page.png';
					break;
				case '/checkout':
					title = 'Checkout';
					desc = 'Home / Checkout';
					bgImage = '/img/banner/checkout.png';
					setAuthHeader(false);
					break;
				default:
					break;
			}

			return { title, desc, bgImage };
		}, [router.pathname]);

		/** LIFECYCLES **/
		useEffect(() => {
			const jwt = getJwtToken();
			if (jwt) updateUserInfo(jwt);
		}, []);

		/** HANDLERS **/

		if (device == 'mobile') {
			return (
				<>
					<Head>
						<title>Veloura</title>
						<meta name={'title'} content={`Veloura`} />
					</Head>
					<Stack id="mobile-wrap">
						<Stack id={'top'}>
							<Top />
						</Stack>

						<Stack id={'main'}>
							<Component {...props} />
						</Stack>

						<Stack id={'footer'}>
							<Footer />
						</Stack>
					</Stack>
				</>
			);
		} else {
			return (
				<>
					<Head>
						<title>Veloura</title>
						<meta name={'title'} content={`Veloura`} />
					</Head>
					<Stack id="pc-wrap">
						<Stack id={'top'}>
							<Top />
						</Stack>

						{!authHeader && memoizedValues.title && (
							<LuxuryPageBanner
								title={t(memoizedValues.title)}
								breadcrumb={memoizedValues.desc ? t(memoizedValues.desc) : undefined}
								bgImage={memoizedValues.bgImage || undefined}
							/>
						)}

						<Stack id={'main'}>
							<Component {...props} />
						</Stack>

						<Chat />

						<Stack id={'footer'}>
							<Footer />
						</Stack>
					</Stack>
				</>
			);
		}
	};
};

export default withLayoutBasic;
