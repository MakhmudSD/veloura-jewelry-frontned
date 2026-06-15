import React, { memo, useRef, useState } from 'react';
import { Box, Button, FormControl, MenuItem, Stack, Typography, Select, TextField } from '@mui/material';
import { BoardArticleCategory } from '../../enums/board-article.enum';
import { Editor } from '@toast-ui/react-editor';
import { getJwtToken } from '../../auth';
import { REACT_APP_API_URL, REACT_APP_API_GRAPHQL_URL, resolveImageUrl } from '../../config';
import { useRouter } from 'next/router';
import axios from 'axios';
import '@toast-ui/editor/dist/toastui-editor.css';
import { CREATE_BOARD_ARTICLE } from '../../../apollo/user/mutation';
import { useMutation } from '@apollo/client';
import { Message } from '../../enums/common.enum';
import { sweetErrorHandling, sweetMixinErrorAlert, sweetTopSmallSuccessAlert } from '../../sweetAlert';

const MAX_TITLE_CHARS = 120;
const MAX_CONTENT_BYTES = 50000;

const byteLen = (s: string) => new TextEncoder().encode(s || '').length;

const isContentEmpty = (html: string) => {
	const text = (html || '')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, '')
		.trim();
	return text.length === 0;
};

const toRelativeUploadPath = (src: string) => {
	if (!src) return '';
	const idx = src.indexOf('/uploads/');
	if (idx >= 0) return src.slice(idx + 1);
	if (REACT_APP_API_URL && src.startsWith(REACT_APP_API_URL)) {
		return src.replace(REACT_APP_API_URL, '').replace(/^\/+/, '');
	}
	return '';
};

const extractFirstImageRelative = (html: string) => {
	const m = (html || '').match(/<img[^>]+src="([^"]+)"/i);
	return toRelativeUploadPath(m?.[1] || '');
};

const TuiEditor = () => {
	const editorRef = useRef<Editor>(null);
	const token = getJwtToken();
	const router = useRouter();

	const [articleCategory, setArticleCategory] = useState<BoardArticleCategory>(BoardArticleCategory.FREE);
	const [articleTitle, setArticleTitle] = useState('');
	const [articleContent, setArticleContent] = useState('');
	const [articleImage, setArticleImage] = useState('');

	const [createBoardArticle] = useMutation(CREATE_BOARD_ARTICLE);

	const uploadImage = async (image: File) => {
		try {
			const formData = new FormData();
			formData.append(
				'operations',
				JSON.stringify({
					query: `mutation ImageUploader($file: Upload!, $target: String!) {
          imageUploader(file: $file, target: $target)
        }`,
					variables: { file: null, target: 'article' },
				}),
			);
			formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
			formData.append('0', image);

			const res = await axios.post(REACT_APP_API_GRAPHQL_URL, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'apollo-require-preflight': 'true',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			});

			const relPath: string = res.data?.data?.imageUploader || '';
			if (relPath && !articleImage) setArticleImage(relPath);
			return resolveImageUrl(relPath);
		} catch (err) {
			console.error('uploadImage error:', err);
			await sweetMixinErrorAlert('Image upload failed.');
			return '';
		}
	};

	const handleRegisterButton = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		try {
			const html = (editorRef.current?.getInstance()?.getHTML?.() as string) || '';
			const title = articleTitle.trim();

			if (!title || isContentEmpty(html)) {
				throw new Error(Message.INSERT_ALL_INPUTS);
			}
			if (title.length > MAX_TITLE_CHARS) {
				throw new Error(`Title too long (>${MAX_TITLE_CHARS} chars).`);
			}
			if (byteLen(html) > MAX_CONTENT_BYTES) {
				throw new Error(`Content too large (>${Math.floor(MAX_CONTENT_BYTES / 1024)} KB).`);
			}

			const cover = articleImage || extractFirstImageRelative(html);

			const input: any = {
				articleTitle: title,
				articleContent: html,
				articleCategory,
			};
			if (cover) input.articleImage = cover;

			await createBoardArticle({ variables: { input } });

			await sweetTopSmallSuccessAlert('Article created successfully!', 700);
			await router.push({ pathname: '/community', query: { category: 'myArticles' } });
		} catch (err: any) {
			const gqlMsg =
				err?.graphQLErrors?.[0]?.extensions?.exception?.response?.message ||
				err?.graphQLErrors?.[0]?.message ||
				err?.message ||
				'Bad Request';
			console.error('Error creating article:', err);
			await sweetErrorHandling(new Error(Array.isArray(gqlMsg) ? gqlMsg.join(', ') : gqlMsg));
		}
	};

	const titleChars = articleTitle.length;
	const contentBytes = byteLen(articleContent);
	const titleOver = titleChars > MAX_TITLE_CHARS;
	const contentOver = contentBytes > MAX_CONTENT_BYTES;

	const disabled = !articleTitle.trim() || isContentEmpty(articleContent) || titleOver || contentOver;

	return (
		<Stack>
			<Stack direction="row" style={{ margin: '40px' }} justifyContent="space-evenly">
				<Box component="div" className="form_row" style={{ width: '300px' }}>
					<Typography style={{ color: '#7f838d', margin: '10px' }} variant="h3">
						Category
					</Typography>
					<FormControl sx={{ width: '100%', background: 'white' }}>
						<Select
							value={articleCategory}
							onChange={(e) => setArticleCategory(e.target.value as BoardArticleCategory)}
							displayEmpty
							inputProps={{ 'aria-label': 'Without label' }}
						>
							<MenuItem value={BoardArticleCategory.FREE}>
								<span>Free</span>
							</MenuItem>
							<MenuItem value={BoardArticleCategory.HUMOR}>Humor</MenuItem>
							<MenuItem value={BoardArticleCategory.NEWS}>News</MenuItem>
							<MenuItem value={BoardArticleCategory.RECOMMEND}>Recommendation</MenuItem>
						</Select>
					</FormControl>
				</Box>

				<Box component="div" style={{ width: '300px', flexDirection: 'column' }}>
					<Typography style={{ color: '#7f838d', margin: '10px' }} variant="h3">
						Title
					</Typography>
					<TextField
						onChange={(e) => setArticleTitle(e.target.value)}
						value={articleTitle}
						id="filled-basic"
						label="Type Title"
						helperText={`${titleChars}/${MAX_TITLE_CHARS}${titleOver ? ' (too long)' : ''}`}
						FormHelperTextProps={{ style: { color: titleOver ? '#d32f2f' : '#7f838d' } }}
						style={{ width: '300px', background: 'white' }}
					/>
				</Box>
			</Stack>

			<Editor
				ref={editorRef}
				initialValue="Type here"
				placeholder="Type here"
				previewStyle="vertical"
				height="640px"
				initialEditType="wysiwyg"
				hideModeSwitch={true}
				toolbarItems={[
					['heading', 'bold', 'italic', 'strike'],
					['image', 'table', 'link'],
					['ul', 'ol', 'task'],
				]}
				hooks={{
					addImageBlobHook: async (image: any, callback: any) => {
						const url = await uploadImage(image);
						if (url) callback(url);
						return false;
					},
				}}
				onChange={() => {
					const html = editorRef.current?.getInstance().getHTML() as string;
					setArticleContent(html || '');
					if (!articleImage) {
						const maybeCover = extractFirstImageRelative(html || '');
						if (maybeCover) setArticleImage(maybeCover);
					}
				}}
				onLoad={() => {
					const html = editorRef.current?.getInstance().getHTML() as string;
					setArticleContent(html || '');
				}}
			/>

			{/* Content size helper */}
			<Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
				<Typography variant="caption" sx={{ color: contentOver ? '#d32f2f' : '#7f838d' }}>
					Content size: {Math.ceil(contentBytes / 1024)} KB / {Math.floor(MAX_CONTENT_BYTES / 1024)} KB{' '}
					{contentOver ? '(too large)' : ''}
				</Typography>
			</Stack>

			<Stack direction="row" justifyContent="center">
				<Button
					variant="contained"
					color="primary"
					style={{ margin: '30px', width: '250px', height: '45px' }}
					onClick={handleRegisterButton}
					disabled={disabled}
				>
					Register
				</Button>
			</Stack>
		</Stack>
	);
};

export default memo(TuiEditor);
