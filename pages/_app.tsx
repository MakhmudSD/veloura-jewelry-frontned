import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { light } from '../scss/MaterialTheme';
import { ApolloProvider } from '@apollo/client';
import { useApollo } from '../apollo/client';
import { appWithTranslation } from 'next-i18next';
import { Judson, Inter } from 'next/font/google';
import { VelouraToastContainer, VelouraConfirmDialog } from '../libs/components/common/VelouraToast';
import Chat from '../libs/components/Chat';
import '../scss/app.scss';
import '../scss/pc/main.scss';
import '../scss/mobile/main.scss';
import 'swiper/css/effect-coverflow';

const judson = Judson({
	weight: ['400', '700'],
	subsets: ['latin'],
	variable: '--font-judson',
	display: 'swap',
});

const inter = Inter({
	subsets: ['latin'],
	weight: ['300', '400', '500', '600'],
	variable: '--font-inter',
	display: 'swap',
});

const App = ({ Component, pageProps }: AppProps) => {
	// @ts-ignore
	const [theme, setTheme] = useState(createTheme(light));
	const client = useApollo(pageProps.initialApolloState);
	const router = useRouter();
	const [transitioning, setTransitioning] = useState(false);

	useEffect(() => {
		const handleStart = () => setTransitioning(true);
		const handleDone = () => {
			setTransitioning(false);
			window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
		};
		router.events.on('routeChangeStart', handleStart);
		router.events.on('routeChangeComplete', handleDone);
		router.events.on('routeChangeError', handleDone);
		return () => {
			router.events.off('routeChangeStart', handleStart);
			router.events.off('routeChangeComplete', handleDone);
			router.events.off('routeChangeError', handleDone);
		};
	}, [router]);

	return (
		<ApolloProvider client={client}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<div
					className={`${judson.variable} ${inter.variable} page-transition${transitioning ? ' page-exit' : ' page-enter'}`}
					style={{ minHeight: '100%' }}
				>
					<Component {...pageProps} />
				</div>
				<Chat />
				<VelouraToastContainer />
				<VelouraConfirmDialog />
			</ThemeProvider>
		</ApolloProvider>
	);
};

export default appWithTranslation(App);
