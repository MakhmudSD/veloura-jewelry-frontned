import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import React, { useState } from 'react';
import { light } from '../scss/MaterialTheme';
import { ApolloProvider } from '@apollo/client';
import { useApollo } from '../apollo/client';
import { appWithTranslation } from 'next-i18next';
import { Judson, Inter } from 'next/font/google';
import '../scss/app.scss';
import '../scss/pc/main.scss';
import '../scss/mobile/main.scss';

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

	return (
		<ApolloProvider client={client}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<div className={`${judson.variable} ${inter.variable}`} style={{ minHeight: '100%' }}>
					<Component {...pageProps} />
				</div>
			</ThemeProvider>
		</ApolloProvider>
	);
};

export default appWithTranslation(App);
